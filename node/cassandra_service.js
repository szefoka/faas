const { workerData, parentPort } = require('worker_threads')
const uuidv4 = require('uuid/v4');
const cassandra = require('cassandra-driver');
const client = new cassandra.Client({ contactPoints: ['cassandra.default.svc.cluster.local'], keyspace: 'testkp', localDataCenter: 'datacenter1'});
var uuid = uuidv4()
const i_query = 'INSERT INTO test (key, value) VALUES(?,?)'
const i_params = [uuid, 'Hello_no']
client.execute(i_query, i_params)
const s_query = 'SELECT * FROM test WHERE key=?';
const s_params = [uuid]
client.execute(s_query, s_params, { prepare: true })
parentPort.postMessage({ hello: workerData })

