// index.js
// run with node --experimental-worker index.js on Node.js 10.x
const http = require('http');
const { Worker } = require('worker_threads')

const hostname = '127.0.0.1';
const port = 15000;

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
  return new Promise((resolve, reject) => {
    const worker = new Worker(file_path, { workerData });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0)
        reject(new Error(`Worker stopped with exit code ${code}`));
    })
  })
}

async function run(res) {
  const result = runService('world');
  result.then(function () {
    res.end("Hello");
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

