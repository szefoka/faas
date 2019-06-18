const { workerData, parentPort } = require('worker_threads')
const uuidv4 = require('uuid/v4');
var redis = require('redis');
var client = redis.createClient(6379, 'redis-master.default.svc.cluster.local');

client.on('connect', function() {});

client.on('error', function (err) {
    console.log('Something went wrong ' + err);
});
var uuid = uuidv4()
client.set(uuid, "Hello_no");
client.get(uuid, function () {});
parentPort.postMessage({ hello: workerData })
