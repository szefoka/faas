const { workerData, parentPort } = require('worker_threads')
const uuidv4 = require('uuid/v4');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://mongodb.default.svc.cluster.local:27017/";

MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
  if (err) throw err;
  var dbo = db.db("testdb");
  var uuid = uuidv4()
  var myobj = { [uuid]:"Hello_no" };
  dbo.collection("testColl").insertOne(myobj, function(err, res) {
    //if (err) throw err;
  });
  dbo.collection("testColl").findOne(myobj, function(err, result) {
    //if (err) throw err;
    //console.log(result);
    db.close();
  });
});
parentPort.postMessage({ hello: workerData })
