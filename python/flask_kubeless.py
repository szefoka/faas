#!/usr/bin/env python

import os
import imp
import datetime
from multiprocessing import Process, Queue
from flask import Flask, request
import json
import redis
import sys
import signal
#import yep
import uuid
import multiprocessing

from pymongo import MongoClient

from cassandra.cluster import Cluster

func_port = os.getenv('FUNC_PORT', 8080)

timeout = float(os.getenv('FUNC_TIMEOUT', 180))

app = Flask(__name__)

def func_echo():
    return "Hello"

def func_compute():
    pi = 0.0
    i = 0
    while i < 50000:
        new = 4.0/(1.0+i*2.0)
        if not i%2:
            pi += new
        else:
            pi -= new
        i += 1
    return str(pi)

def func_redis():
    try:
        r = redis.Redis(host='redis-master.default.svc.cluster.local', port=6379, db=0)
        _uuid = str(uuid.uuid4())
        r.set(_uuid, 'Hello_py')
        return r.get(_uuid)
    finally:
        r.connection_pool.disconnect()

def func_mongo():
    try:
        client = MongoClient('mongodb.default.svc.cluster.local', 27017)
        db = client['testdb']
        collection = db.testColl
        _uuid = str(uuid.uuid4())
        t = {_uuid:'Hello_py'}
        db.testColl.insert(t)
        return str(db.testColl.find_one(t)[_uuid])
    finally:
        client.close()

def func_cassandra():
    try:
        cluster = Cluster(['cassandra.default.svc.cluster.local'],  port=9042)
        session = cluster.connect('testkp')
        _uuid=uuid.uuid4()
        session.execute(
            """
            INSERT INTO test (key, value)
            VALUES (%s, %s)
            """,
            (_uuid, "Hello_py")
        )
        res = session.execute(
            session.prepare('SELECT * FROM test WHERE key=?'), [_uuid]
        )
        return res[0][1]
    finally:
        cluster.shutdown()

func_type = os.getenv('FUNC_TYPE')
func_ptr = None
if func_type == 'compute':
    func_ptr = func_compute
elif func_type == 'echo':
    func_ptr = func_echo
elif func_type == 'redis':
    func_ptr = func_redis
elif func_type == 'mongo':
    func_ptr = func_mongo
elif func_type == 'cassandra':
    func_ptr =  func_cassandra


@app.route('/healthz')
def healthz():
    return 'OK'

@app.route('/faas-test', methods=['GET', 'POST', 'PATCH', 'DELETE'])
def handler():
    return func_ptr()

def signal_handler(sig, frame):
        print('You pressed Ctrl+C!')
        #yep.stop()
        sys.exit(0)

if __name__ == '__main__':
    import logging
    import sys
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    #yep.start('file_name.prof')
    flask_mode = os.getenv('FLASK_MODE')
    if flask_mode == 'single':
        app.run('0.0.0.0', 15000, debug=False, threaded = False)
    elif flask_mode == 'threaded':
        app.run('0.0.0.0', 15000, debug=False, threaded = True)
    elif flask_mode == 'multiprocess':
        cores = multiprocessing.cpu_count()
        app.run('0.0.0.0', 15000, debug=False, threaded = False, processes=cores)

    signal.signal(signal.SIGINT, signal_handler)
    print('Press Ctrl+C')
    signal.pause()


