package main

import (
	"fmt"
	"log"
//	"math"
	"net/http"
        _ "net/http/pprof"
	"sync"
	"time"
	"os"
	"os/signal"
	"syscall"
	"runtime/trace"
	"runtime"
	"github.com/go-redis/redis"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
	"github.com/google/uuid"
	"context"
	"github.com/gocql/gocql"
//	"github.com/pkg/profile"

	// "github.com/alexellis/golang-http-template/template/golang-http/function"
)

var func_type = os.Getenv("FUNC_TYPE")
type FuncTest func()
var func_test FuncTest

func compute_test() {
	pi := 0.0
	for i := 0.0; i < 5000000.0; i++ {
		_new := 4.0/(1.0+i*2.0)
		if ((int(i))%2) == 0 {
			pi += _new
		} else {
			pi -= _new
		}
	}
}

func mongo_test() {
	type result struct {
		_uuid string
		value string
	}
	//ctx, _ := context.WithTimeout(context.Background(), 2*time.Second)
	ctx := context.TODO()
	client, _ := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://mongodb.default.svc.cluster.local:27017"))
	collection := client.Database("testdb").Collection("testColl")
	_uuid, _ := uuid.NewRandom()
	dict := bson.M{_uuid.String(): "Hello_go"}
	res, _ := collection.InsertOne(ctx, dict)
	var _r result
	_ = collection.FindOne(ctx, dict).Decode(&_r)
	_ = res.InsertedID
	client.Disconnect(ctx)
}

func cassandra_test() {
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
}

func redis_test() {
	client := redis.NewClient(&redis.Options{
		Addr:     "redis-master.default.svc.cluster.local:6379",
		Password: "", // no password set
		DB:       0,  // use default DB
	})
	_uuid, _ := uuid.NewRandom()
	s_uuid := _uuid.String()
	client.Set(s_uuid, "Hello_go", 0).Err()
	client.Get(s_uuid).Result()
}

func makeRequestHandler() func(http.ResponseWriter, *http.Request) {
        return func(w http.ResponseWriter, r *http.Request) {
                if r.Body != nil {
                        defer r.Body.Close()
		}
		if func_test != nil {
			func_test()
		}
		w.Write([]byte("Hello"))
        }
}

func main() {
//	defer profile.Start().Stop()
	runtime.SetMutexProfileFraction(1)

	f, err := os.Create("./trace.out")
	if err != nil {
		panic(err)
	}
	defer f.Close()

	err = trace.Start(f)
	if err != nil {
		panic(err)
	}
	defer trace.Stop()

	go func() {
		log.Println(http.ListenAndServe("0.0.0.0:6060", nil))
	}()
	var wg sync.WaitGroup
	wg.Add(1)

	var gracefulStop = make(chan os.Signal)
	signal.Notify(gracefulStop, syscall.SIGTERM)
	signal.Notify(gracefulStop, syscall.SIGINT)
	go func() {
		sig := <-gracefulStop
		fmt.Printf("caught sig: %+v", sig)
		fmt.Println("Wait for 2 second to finish processing")
		time.Sleep(2*time.Second)
		trace.Stop()
                f.Close()
		os.Exit(0)
	}()
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
	wg.Wait()
/*
	var gracefulStop = make(chan os.Signal)
	signal.Notify(gracefulStop, syscall.SIGTERM)
	signal.Notify(gracefulStop, syscall.SIGINT)

	go func() {
		sig := <-gracefulStop
		fmt.Printf("caught sig: %+v", sig)
		fmt.Println("Wait for 2 second to finish processing")
		time.Sleep(2*time.Second)
		os.Exit(0)
	}()
*/
	signalChan := make(chan os.Signal, 1)
	signal.Notify(signalChan, os.Interrupt)
	<-signalChan
}

