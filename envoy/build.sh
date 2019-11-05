IP=$(ip a show dev eno49 | grep inet | grep -v inet6 | awk '{print $2}' | cut -d "/" -f 1)
IMG_NAME=faas-envoy
docker build -t $IMG_NAME .
docker tag faas-envoy $IP:5000/$IMG_NAME
docker push $IP:5000/$IMG_NAME
