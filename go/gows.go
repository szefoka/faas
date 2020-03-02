package main

import (
	"strings"
	"fmt"
	"strconv"
	"log"
	"net/http"
        _ "net/http/pprof"
	"time"
	"os"
	"github.com/go-redis/redis"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
	"github.com/google/uuid"
	"context"
	"github.com/gocql/gocql"
)

var func_type = os.Getenv("FUNC_TYPE")
type FuncTest func() string
var func_test FuncTest

func compute_test() string {
	pi := 0.0
	for i := 0.0; i < 50000.0; i++ {
		_new := 4.0/(1.0+i*2.0)
		if ((int(i))%2) == 0 {
			pi += _new
		} else {
			pi -= _new
		}
	}
        return strconv.FormatFloat(pi, 'f', -1, 64)
}

func mongo_test() string {
	//ctx, _ := context.WithTimeout(context.Background(), 2*time.Second)
	ctx := context.TODO()
	client, _ := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://mongodb.default.svc.cluster.local:27017"))
	collection := client.Database("testdb").Collection("testColl")
	_uuid, _ := uuid.NewRandom()
        _suuid := _uuid.String()
	dict := bson.M{_suuid: "Hello_go"}
	_, err := collection.InsertOne(ctx, dict)
        var _r bson.Raw
	_r, err = collection.FindOne(ctx, dict).DecodeBytes()
        _res := _r.Lookup(_suuid)
        if err != nil {
            log.Fatal(err)
        }
	client.Disconnect(ctx)
        return strings.Replace(_res.String(), "\"", "", -1)
}

func cassandra_test() string {
	cluster := gocql.NewCluster("cassandra.default.svc.cluster.local")
	cluster.Keyspace = "testkp"
	cluster.Consistency = gocql.Quorum
	session, _ := cluster.CreateSession()
	defer session.Close()
	var id gocql.UUID
	var text string
	_uuid, _ := uuid.NewRandom()
	s_uuid := _uuid.String()

	if err := session.Query(`INSERT INTO test (key, value) VALUES (?, ?)`,
		s_uuid, "Hello_go").Exec(); err != nil {
		log.Fatal(err)
	}
	if err := session.Query(`SELECT * FROM test WHERE key = ? LIMIT 1`,
		s_uuid).Consistency(gocql.One).Scan(&id, &text); err != nil {
		log.Fatal(err)
	}
        return text
}

func redis_test() string {
	client := redis.NewClient(&redis.Options{
		Addr:     "redis-master.default.svc.cluster.local:6379",
		Password: "", // no password set
		DB:       0,  // use default DB
	})
	_uuid, _ := uuid.NewRandom()
	s_uuid := _uuid.String()
	client.Set(s_uuid, "Hello_go", 0).Err()
	val, err := client.Get(s_uuid).Result()
	if err != nil {
		panic(err)
	}
        return val
}

func makeRequestHandler() func(http.ResponseWriter, *http.Request) {
        return func(w http.ResponseWriter, r *http.Request) {
                var res = "Hello"
                if r.Body != nil {
                        defer r.Body.Close()
		}
		if func_test != nil {
			res = func_test()
		}
		w.Write([]byte(res))
        }
}

func main() {
	switch func_type {
		case "compute":
			func_test = compute_test
		case "echo":
			//do nothing
			func_test = nil
		case "redis":
			func_test = redis_test
		case "mongo":
			func_test = mongo_test
		case "cassandra":
			func_test = cassandra_test
	}
	s := &http.Server{
		Addr:           fmt.Sprintf(":%d", 15000),
		ReadTimeout:    3 * time.Second,
		WriteTimeout:   3 * time.Second,
		MaxHeaderBytes: 1 << 20, // Max header of 1MB
	}
	http.HandleFunc("/", makeRequestHandler())
	log.Fatal(s.ListenAndServe())
}

