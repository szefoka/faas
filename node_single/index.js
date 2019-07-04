const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;
const hostname = '0.0.0.0';
const port = 15000;

var fptr;

const num_procs = process.env.NUM_PROCS
const func_type = process.env.FUNC_TYPE
var file_path = "";
switch(func_type) {
    case 'compute':
        fptr = function (query, callback) {
            var i;
            var pi = 0;
            for (i = 0; i < 50000; i++) {
                _new = 4.0/(1.0+i*2.0);
                if (i%2 != 0) {
                    pi -= _new
                }
                else {
                    pi += _new
                }
            }
            callback(pi.toString());
        };
        break;
    case 'echo':
        fptr = function (query, callback) { callback ("Hello");}
        break;
    case 'redis':
        fptr = function (query, callback) {
            var redis = require('redis');
            const uuidv4 = require('uuid/v4');
            var client = redis.createClient(6379, 'redis-master.default.svc.cluster.local');
            client.on('connect', function() {});
            client.on('error', function (err) {
                console.log('Something went wrong ' + err);
            });
            var uuid = uuidv4()
            client.set(uuid, "Hello_no");
            client.get(uuid, function (err, reply) {
                callback(reply);
                client.quit();
            });
        }
        break;
    case 'mongo':
        fptr = function (query, callback) {
            const uuidv4 = require('uuid/v4');
            var MongoClient = require('mongodb').MongoClient;
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
                  db.close();
                  callback(result[uuid]);
                });
            });
        }
        break;
    case 'cassandra':
        fptr = function (query, callback) {
            const uuidv4 = require('uuid/v4');
            const cassandra = require('cassandra-driver');
            const client = new cassandra.Client({ contactPoints: ['cassandra.default.svc.cluster.local'], keyspace: 'testkp', localDataCenter: 'datacenter1'});
            var uuid = uuidv4()
            const i_query = 'INSERT INTO test (key, value) VALUES(?,?)'
            const i_params = [uuid, 'Hello_no']
            client.execute(i_query, i_params)
            const s_query = 'SELECT * FROM test WHERE key=?';
            const s_params = [uuid]
            var res;
            client.execute(s_query, s_params, { prepare: true }).then(result => {
                client.shutdown();
                callback(result.rows[0].value.toString());
            });
        }
        break;
}

if (num_procs > 1) {
  if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    // Fork workers.
    for (let i = 0; i < num_procs; i++) {
      cluster.fork();
    }
    cluster.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`);
    });
  } else {
    // Workers can share any TCP connection
    // In this case it is an HTTP server
    http.createServer((req, res) => {
      var result;
      fptr(result, function(ret){
        res.write(ret);
        res.end();
      });
    }).listen(port);

    console.log(`Worker ${process.pid} started`);
  }
} else {
    http.createServer((req, res) => {
      var result;
      fptr(result, function(ret){
        res.write(ret);
        res.end();
      });
    }).listen(port);
}

