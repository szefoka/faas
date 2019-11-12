IP_PORT=$(ip a l $(route -n | awk '$1 == "0.0.0.0" {print $8}') | grep "inet" | grep -v inet6 | awk '{print $2}' | cut -d / -f 1):5000

#faas-envoy
cd envoy
bash build.sh
cd ..
yq w python/envoy/dep.yaml spec.template.spec.containers[0].image "$IP_PORT"/faas-envoy
yq w node-single/envoy/dep.yaml spec.template.spec.containers[0].image "$IP_PORT"/faas-envoy

#python
cd python
bash build.sh
kubectl apply -f svc.yaml
kubectl apply -f envoy/
kubectl apply -f istio/
cd ..

#Node.js
cd node-single
bash build.sh
kubectl apply -f svc.yaml
kubectl apply -f envoy/
kubectl apply -f istio/
cd ..
