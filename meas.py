from yaml import load, dump
import sys
import os
import subprocess
import time

if not ("/root/go/bin" in os.environ['PATH']):
    os.environ['PATH'] += os.pathsep + os.pathsep.join(["/root/go/bin"])

runtimes = ["python", "node_single"]
tasks = ["compute", "redis"]
proxies = ["kubeproxy", "envoy", "istio"]
envoy_lb_algs=["RANDOM", "ROUND_ROBIN", "LEAST_REQUEST"]
istio_lb_algs=["RANDOM", "ROUND_ROBIN", "LEAST_CONN"]
limits=[[250, 32], [500, 16], [1000, 8]]

def do_meas(runtime, addr, filename, task):
    for l in limits:
        y = None
        with open(runtime+"/dep.yaml", "r") as f:
            y = f.read()
        y = load(y)

        y['spec']['template']['spec']['containers'][0]['resources']={'limits' : {'cpu' : str(l[0])+"m"}}
        y['spec']['template']['spec']['containers'][0]['env'][0]['value']=task
        s = dump(y)
        print s
        f = open("tmp_dep.yaml", "w")
        f.write(s)
        f.close()
        os.system("kubectl apply -f tmp_dep.yaml")
        os.system("kubectl scale deployments/"+runtime+ " --replicas="+str(l[1]))
        while(True):
            output = os.popen("kubectl get pods")
            output = output.read()
            if not ("Terminating" in output or "ContainerCreating" in output):
                break
            time.sleep(1)

        os.system("hey -c 100 -n 500000 -o csv http://"+addr+" > " + runtime+"_"+task+"_"+str(l[0])+filename+".csv")


for runtime in runtimes:
    print runtime
    output = os.popen("kubectl get services | grep "+runtime+"-envoy | awk '{print $3 \"\t\" $5}' | cut -d '/' -f 1")
    envoy_addr = output.read().split()
    output = os.popen("kubectl get services | grep "+runtime+" | grep -v headless | awk '{print $3 \"\t\" $5}' | cut -d '/' -f 1 | cut -d ':' -f 1")
    kubeproxy_addr = output.read().split()
    output = os.popen("kubectl get services -n istio-system | grep istio-ingressgateway | awk '{print $3}'")
    istio_addr = output.read()
    istio_addr = istio_addr.split()[0]+"/"+runtime
    print envoy_addr
    print kubeproxy_addr
    print istio_addr
    for t in tasks:
        for p in proxies:
            #p = "envoy"
            if p == "kubeproxy":
                addr = kubeproxy_addr[0]+":"+kubeproxy_addr[1]
                if runtime == "python":
                    addr += "/python"
                filename="_kubeproxy"
                do_meas(runtime, addr, filename, t)
            if p == "envoy":
                addr=envoy_addr[0] +":"+envoy_addr[1]
                if runtime == "python":
                    addr += "/python"
                y = None
                for alg in envoy_lb_algs:
                    with open(runtime+"/envoy/dep.yaml", "r") as f:
                        y = f.read()
                    y = load(y)
                    y['spec']['template']['spec']['containers'][0]['env'][0]['value'] = alg
                    s = dump(y)
                    f = open("tmp_envoy_dep.yaml", "w")
                    f.write(s)
                    f.close()
                    os.system("kubectl apply -f tmp_envoy_dep.yaml")
                    while(True):
                        output = os.popen("kubectl get pods")
                        output = output.read()
                        if not ("Terminating" in output or "ContainerCreating" in output or "Pending" in output):
                            break
                        time.sleep(1)
                    filename="_envoy_"+alg
                    do_meas(runtime, addr, filename, t)
            if p == "istio":
                y = None
                addr = istio_addr
                for alg in istio_lb_algs:
                    with open(runtime+"/istio/destination_rule.yaml", "r") as f:
                        y = f.read()
                    y = load(y)
                    y['spec']['trafficPolicy']['loadBalancer']['simple'] = alg
                    s = dump(y)
                    f = open("tmp_destination_rule.yaml", "w")
                    f.write(s)
                    f.close()
                    os.system("kubectl apply -f tmp_destination_rule.yaml")
                    time.sleep(10)
                    filename ="_istio_"+alg
                    do_meas(runtime, addr, filename, t)
    os.system("kubectl delete -f tmp_dep.yaml")
