const { workerData, parentPort } = require('worker_threads')
parentPort.postMessage({ hello: workerData })