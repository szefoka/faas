const { workerData, parentPort } = require('worker_threads')
var i;
var pi = 0;
for (i = 0; i < 50000; i++) {
  _new = 4.0/(1.0+i*2.0);
  if (i%2 != 0) {
    pi += _new
  }
  else {
    pi -= _new
  }
}
parentPort.postMessage(pi)

