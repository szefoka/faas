var http = require('http');
const uuidv4 = require('uuid/v4');
var MongoClient = require('mongodb').MongoClient;
const cassandra = require('cassandra-driver');
var redis = require('redis');

const hostname = '0.0.0.0';
const port = 15000;
var fptr;

const func_type = process.env.FUNC_TYPE
var file_path = "";
switch(func_type) {
    case 'compute':
        fptr = function () {
            var i;
            var pi = 0;
            for (i = 0; i < 5000000; i++) {
                _new = 4.0/(1.0+i*2.0);
                if (i%2 != 0) {
                    pi += _new
                }
                else {
                    pi -= _new
                }
            }
        };
        break;
    case 'echo':
        fptr = function () { }
        break;
    case 'redis':
        fptr = function () {
            var client = redis.createClient(6379, 'redis-master.default.svc.cluster.local');
            client.on('connect', function() {});
            client.on('error', function (err) {
                console.log('Something went wrong ' + err);
            });
            var uuid = uuidv4()
            client.set(uuid, "Hello_no");
            client.get(uuid, function () {});
        }
        break;
    case 'mongo':
        fptr = function () {
            var url = "mongodb://mongodb.default.svc.cluster.local:27017/";
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
        }
        break;
    case 'cassandra':
        fptr = function () {
            const { workerData, parentPort } = require('worker_threads')
            const uuidv4 = require('uuid/v4');
            const cassandra = require('cassandra-driver');
            const client = new cassandra.Client({ contactPoints: ['cassandra.default.svc.cluster.local'], keyspace: 'testkp', localDataCenter: 'datacenter1'});
            var uuid = uuidv4()
            const i_query = 'INSERT INTO test (key, value) VALUES(?,?)'
            const i_params = [uuid, 'Hello_no']
            client.execute(i_query, i_params)
            const s_query = 'SELECT * FROM test WHERE key=?';
            const s_params = [uuid]
            client.execute(s_query, s_params, { prepare: true })
            parentPort.postMessage({ hello: workerData })
        }
        break;
}

//create a server object:
http.createServer(function (req, res) {
  fptr();
  res.write('Hello World!'); //write a response to the client
  res.end(); //end the response
}).listen(port); //the server object listens on port 8080

