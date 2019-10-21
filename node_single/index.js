const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;
const fs = require('fs');
const random = require('random');
const hostname = '0.0.0.0';
const port = 14000;

var fptr;

const num_procs = process.env.NUM_PROCS;
const func_type = process.env.FUNC_TYPE;
const cgtrick = process.env.USE_CG_TRICK;
uv_cpu_time = process.env.UV_CPU_TIME;
v8_cpu_time = process.env.V8_CPU_TIME;
error_rate = process.env.ERROR_RATE;
var err_max = Math.pow(10, -1*(error_rate));
var file_path = "";
var first_run = cgtrick;

if(cgtrick!=0) {
    process.env.UV_THREADPOOL_SIZE = 1;
}

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
                if (first_run!=0) {
                    first_run = 0;
                    fs.mkdirSync("/sys/fs/cgroup/cpuacct/node", 0755);
                    fs.mkdirSync("/sys/fs/cgroup/cpuacct/node/v8", 0755);
                    fs.mkdirSync("/sys/fs/cgroup/cpuacct/node/uv", 0755);
                    fs.writeFile("/sys/fs/cgroup/cpuacct/node/v8/tasks", "1", function(err) {
                        if(err) { return console.log(err); }
                        console.log("The file was saved! 1");
                    });
                    fs.readFile('/sys/fs/cgroup/cpuacct/tasks', 'utf-8', function(err, data) {
                        if (err) { throw err; }
                        var lines = data.trim().split('\n');
                        var lastLine = lines.slice(-1)[0];
                        fs.writeFile("/sys/fs/cgroup/cpuacct/node/uv/tasks", lastLine, function(err) {
                            if(err) { return console.log(err); }
                            console.log("The file was saved! 3");
                        });
                    });
                    var maxcpu = 0;
                    fs.readFile('/sys/fs/cgroup/cpuacct/cpu.cfs_quota_us', 'utf-8', function(err, data) {
                        if (err) { throw err; }
                        var lines = data.trim().split('\n');
                        maxcpu = lines.slice(-1)[0];
                        fs.writeFile("/sys/fs/cgroup/cpuacct/node/uv/cpu.cfs_quota_us", Math.trunc(maxcpu * uv_cpu_time), function(err) {
                            if(err) { return console.log(err); }
                            console.log("The file was saved! 4");
                        });
                        fs.writeFile("/sys/fs/cgroup/cpuacct/node/v8/cpu.cfs_quota_us", Math.trunc(maxcpu * v8_cpu_time), function(err) {
                            if(err) { return console.log(err); }
                            console.log("The file was saved! 2");
                        });
                    });
                }
            });
            if(error_rate != 0) {
                if(random.int(0, err_max) == err_max-1) {
                    process.exit(1);
                }
            }
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

