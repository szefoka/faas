/*
const { workerData, parentPort } = require('worker_threads')
var i;
var sum = 0;
for (i = 0; i < 300000000; i++) {
  sum = sum+Math.sqrt(i);
}
// You can do any heavy stuff here, in a synchronous way
// without blocking the "main thread"
parentPort.postMessage({ hello: workerData })
*/

/*
const { workerData, parentPort } = require('worker_threads')
var redis = require('redis');
var client = redis.createClient(6379, '10.107.0.114');

client.on('connect', function() {});

client.on('error', function (err) {
    console.log('Something went wrong ' + err);
});

client.set('test_no', 'Hello');
client.get('test_no', function () {});
parentPort.postMessage({ hello: workerData })
*/

const { workerData, parentPort } = require('worker_threads')
const uuidv4 = require('uuid/v4');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
  if (err) throw err;
  var dbo = db.db("testdb");
  var uuid = uuidv4()
  var myobj = { [uuid]:"Hello_no" };
  dbo.collection("testColl").insertOne(myobj, function(err, res) {
    //if (err) throw err;
  });
  dbo.collection("testColl").findOne(myobj, function(err, result) {
    //if (err) throw err;
    //console.log(result);
    db.close();
  });
});
parentPort.postMessage({ hello: workerData })
