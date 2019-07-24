import os
import handler

class Context:
    def __init__(self):
        self.collect_functions()

    def create_method(self, name, addr):
        def call():
           handler.myfunc()
           print addr
        def call_async():
           handler.myfunc()
           print addr +" async"
        return [call, call_async]


    def collect_functions(self):
        functions = {}
        for line in os.popen('kubectl get services -l function').readlines()[1:]:
            functions[line.split()[0]] = line.split()[2]
        for f in functions.keys():
            funcs = self.create_method(f, functions[f])
            setattr(self, f, funcs[0])
            setattr(self, f+"_async", funcs[1])


ctx = Context()
ctx.pythontest()
ctx.pythontest_async()

