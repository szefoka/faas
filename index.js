
// index.js
// run with node --experimental-worker index.js on Node.js 10.x
const http = require('http');
const { Worker } = require('worker_threads')

const hostname = '127.0.0.1';
const port = 3000;

function runService(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./service.js', { workerData });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0)
        reject(new Error(`Worker stopped with exit code ${code}`));
    })
  })
}

async function run(res) {
  //const result = await runService('world');
  const result = runService('world');
  result.then(function () {
    //console.log("resolved");
    res.end("Hello");
  });
  result.catch(function () {
    console.log("rejected");
  });
//  res.end(result);
//  console.log(result);
//  res.end(result);
//  console.log(result);
}
const server = http.createServer((req, res) => {
   //run().catch(err => console.error(err))
  run(res);
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

