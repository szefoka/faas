
const { workerData, parentPort } = require('worker_threads')
var i;
var sum = 0;
for (i = 0; i < 15000000; i++) {
  sum = sum+Math.sqrt(i);
}
// You can do any heavy stuff here, in a synchronous way
// without blocking the "main thread"
parentPort.postMessage({ hello: workerData })
