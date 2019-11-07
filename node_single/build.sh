NAME=node-single-test
IP_PORT=$(ip a l $(route -n | awk '$1 == "0.0.0.0" {print $8}') | grep "inet" | grep -v inet6 | awk '{print $2}' | cut -d / -f 1):5000
docker build -t $IP_PORT/$NAME .
docker push $IP_PORT/$NAME
yq w --inplace dep.yaml spec.template.spec.containers[0].image "$IP_PORT"/$NAME
#sed -i "/image:/s/$/ $IP_PORT\/$NAME/" dep.yaml
