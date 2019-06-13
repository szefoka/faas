/*
const { workerData, parentPort } = require('worker_threads')
var i;
var sum = 0;
for (i = 0; i < 150000000; i++) {
  sum = sum+Math.sqrt(i);
}
// You can do any heavy stuff here, in a synchronous way
// without blocking the "main thread"
parentPort.postMessage({ hello: workerData })
*/

const { workerData, parentPort } = require('worker_threads')
var redis = require('redis');
var client = redis.createClient(6379, '10.107.0.114');

client.on('connect', function() {});

client.on('error', function (err) {
    console.log('Something went wrong ' + err);
});

client.set('test', 'Hello');
client.get('test', function () {});
parentPort.postMessage({ hello: workerData })

