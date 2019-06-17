const { workerData, parentPort } = require('worker_threads')
var i;
var sum = 0;
for (i = 0; i < 300000000; i++) {
  sum = sum+Math.sqrt(i);
}
parentPort.postMessage({ hello: workerData })
