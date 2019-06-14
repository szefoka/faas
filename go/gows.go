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
//	"github.com/pkg/profile"

	// "github.com/alexellis/golang-http-template/template/golang-http/function"
)
/*
func makeRequestHandler() func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Body != nil {
			defer r.Body.Close()
		}

   	        sum := 0.0
		for i := 0.0; i < 120000000.0; i++ {
			sum += math.Sqrt(i)
		}
		sum = 0
		w.Write([]byte("Hello"))
	}
}
*/
/*
func makeRequestHandler() func(http.ResponseWriter, *http.Request) {
        return func(w http.ResponseWriter, r *http.Request) {
                if r.Body != nil {
                        defer r.Body.Close()
                }

		client := newClient()
		err := set(client)
		if err != nil {
			fmt.Println(err)
		}

		val, err := get(client)
		if err != nil {
			fmt.Println(err)
		}
                w.Write([]byte(val))
        }
}
*/
func makeRequestHandler() func(http.ResponseWriter, *http.Request) {
        return func(w http.ResponseWriter, r *http.Request) {
                if r.Body != nil {
                        defer r.Body.Close()
                }

		type result struct {
			_uuid string
			value string
		}
		//ctx, _ := context.WithTimeout(context.Background(), 2*time.Second)
		ctx := context.TODO()
		client, _ := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
		collection := client.Database("testdb").Collection("testColl")
		_uuid, _ := uuid.NewRandom()
		dict := bson.M{_uuid.String(): "Hello_go"}
		res, _ := collection.InsertOne(ctx, dict)
		var _r result
		_ = collection.FindOne(ctx, dict).Decode(&_r)
		_ = res.InsertedID
		client.Disconnect(ctx)
		w.Write([]byte("Hello"))
	}
}

func newClient() *redis.Client {
	client := redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: "", // no password set
		DB:       0,  // use default DB
	})

	return client
}

func set(client *redis.Client) error {
	err := client.Set("test", "Hello", 0).Err()
	if err != nil {
		return err
	}
	return nil
}

func get(client *redis.Client) (string, error) {
	val, err := client.Get("test").Result()
	if err != nil {
		return "", err
	}
	//fmt.Println("key", val)

	return val, err
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

