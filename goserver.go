package main

import __log "github.com/jbardin/gotrace/log"

import (
	"fmt"
	"log"
	"math"
	"net/http"
	_ "net/http/pprof"
	"os"
	"os/signal"
	"runtime/trace"
	"sync"
	"syscall"
	"time"
)

func sayHello(w http.ResponseWriter, r *http.Request) {
	__traceID := __log.ID()
	__log.L.Printf("[%d] sayHello(%s)\n", __traceID, __log.Format(w, r))

	defer func() {
		since := ""
		__log.L.Printf("[%d] sayHello returned %s\n", __traceID, since)
	}()

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
func main() {
	__traceID := __log.ID()
	__log.L.Printf("[%d] main(%s)\n", __traceID, __log.Format())

	defer func() {
		since := ""
		__log.L.Printf("[%d] main returned %s\n", __traceID, since)
	}()

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
		__traceID := __log.ID()
		__log.L.Printf("[%d] func(%s) [./goserver.go:43:5]\n", __traceID, __log.Format())

		defer func() {
			since := ""
			__log.L.Printf("[%d] func [./goserver.go:43:5] returned %s\n", __traceID, since)
		}()

		log.Println(http.ListenAndServe("0.0.0.0:6060", nil))
	}()
	var wg sync.WaitGroup
	wg.Add(1)
	var gracefulStop = make(chan os.Signal)
	signal.Notify(gracefulStop, syscall.SIGTERM)
	signal.Notify(gracefulStop, syscall.SIGINT)
	go func() {
		__traceID := __log.ID()
		__log.L.Printf("[%d] func(%s) [./goserver.go:51:5]\n", __traceID, __log.Format())

		defer func() {
			since := ""
			__log.L.Printf("[%d] func [./goserver.go:51:5] returned %s\n", __traceID, since)
		}()

		sig := <-gracefulStop
		fmt.Printf("caught sig: %+v", sig)
		fmt.Println("Wait for 2 second to finish processing")
		time.Sleep(2 * time.Second)
		trace.Stop()
		f.Close()
		os.Exit(0)
	}()

	http.HandleFunc("/", sayHello)
	if err := http.ListenAndServe(":15000", nil); err != nil {
		panic(err)

	}
	wg.Wait()
	signalChan := make(chan os.Signal, 1)
	signal.Notify(signalChan, os.Interrupt)
	<-signalChan
}

var _ = __log.Setup("stderr", "", 1024)
