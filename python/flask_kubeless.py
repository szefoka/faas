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

func_type = os.getenv('FUNC_TYPE')

def func_echo():
    return "Hello"

def func_compute():
    pi = 0.0
    i = 0
    while i < 5000000:
        new = 4.0/(1.0+i*2.0)
        if not i%2:
            pi += new
        else:
            pi -= new
        i += 1

def func_redis():
    r = redis.Redis(host='localhost', port=6379, db=0)
    r.set(str(uuid.uuid4()), 'Hello_py')
    return r.get('python_test')

def func_mongo():
    client = MongoClient('localhost', 27017)
    db = client['testdb']
    collection = db.testColl
    t = {str(uuid.uuid4()):'Hello_py'}
    db.testColl.insert(t)
    res = str(db.testColl.find_one(t))
    return res

def func_cassandra():
    cluster = Cluster(['127.0.0.1'],  port=9042)
    session = cluster.connect('testkp')
    _uuid=(uuid.uuid4())
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
    session.shutdown()
    #print res[0]
    return "hello"

@app.route('/healthz')
def healthz():
    return 'OK'

@app.route('/faas-test', methods=['GET', 'POST', 'PATCH', 'DELETE'])
def handler():
    if func_type == 'compute':
        func_compute()
    elif func_type == 'echo':
        func_echo()
    elif func_type == 'redis':
        func_redis()
    elif func_type == 'mongo':
        func_mongo()
    elif func_type == 'cassandra':
        func_cassandra()
    return func_cassandra()

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
        app.run('0.0.0.0', 15000, debug=False, threaded = false)
    elif flask_mode == 'threaded':
        app.run('0.0.0.0', 15000, debug=False, threaded = true)
    elif flask_mode == 'multiprocess':
        cores = multiprocessing.cpu_count()
        app.run('0.0.0.0', 15000, debug=False, threaded = False, processes=cores)

    signal.signal(signal.SIGINT, signal_handler)
    print('Press Ctrl+C')
    signal.pause()
