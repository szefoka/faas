// index.js
// run with node --experimental-worker index.js on Node.js 10.x
const http = require('http');
const { Worker } = require('worker_threads')
const Pool = require('worker-threads-pool');
const pool = new Pool({max: 10});

const hostname = '0.0.0.0';
const port = 15000;

const worker_type = process.env.WORKER_TYPE
const func_type = process.env.FUNC_TYPE
var file_path = "";
switch(func_type) {
    case 'compute':
        file_path = "./compute_service.js";
        break;
    case 'echo':
        file_path = "./echo_service.js";
        break;
    case 'redis':
        file_path = "./redis_service.js";
        break;
    case 'mongo':
        file_path = "./mongo_service.js";
        break;
    case 'cassandra':
        file_path = "./cassandra_service.js";
        break;
}


function runService(workerData) {
  switch(worker_type) {
    case 'worker':
      return new Promise((resolve, reject) => {
        const worker = new Worker(file_path, {workerData});
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0)
            reject(new Error(`Worker stopped with exit code ${code}`));
        })
      })
      break;
    case 'pool':
      return new Promise((resolve, reject) => {
        pool.acquire(file_path, {workerData}, function (err, worker) {
          worker.on('message', resolve);
          worker.on('error', reject);
          worker.on('exit', (code) => {
            if (code !== 0)
              reject(new Error(`Worker stopped with exit code ${code}`));
          })
        })
      })
      break;
  }
}

async function run(res) {
  var r;
  const result = runService('');
  result.then(function (_result) {
    //console.log(_result)
    res.end(_result.toString());
  });
  result.catch(function () {
    console.log("rejected");
  });
}
const server = http.createServer((req, res) => {
  run(res);
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
