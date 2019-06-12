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
import yep

func_port = os.getenv('FUNC_PORT', 8080)

timeout = float(os.getenv('FUNC_TIMEOUT', 180))

app = Flask(__name__)
def funcWrap(q, data):
    try:
        q.put(func(data))
    except Exception as inst:
        q.put(inst)

def func():
    r = redis.Redis(host='localhost', port=6379, db=0)
    r.set('python_test', 'Hello')
    return r.get('python_test')

@app.route('/healthz')
def healthz():
    return 'OK'

@app.route('/faas-test', methods=['GET', 'POST', 'PATCH', 'DELETE'])
def handler():
    return func()

def signal_handler(sig, frame):
        print('You pressed Ctrl+C!')
        yep.stop()
        sys.exit(0)

if __name__ == '__main__':
    import logging
    import sys
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    yep.start('file_name.prof')
    app.run('0.0.0.0', 15000, debug=False)
    signal.signal(signal.SIGINT, signal_handler)
    print('Press Ctrl+C')
    signal.pause()
