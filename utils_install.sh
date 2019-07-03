#redis-cli
apt-get install -y redis-tools

#mongo cli
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 0C49F3730359A14518585931BC711F9BA15703C6
echo "deb [ arch=amd64,arm64 ] http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.4.list
sudo apt-get update
sudo apt-get install -y mongodb-org-tools

#pip
apt-get install python-pip
#cqlsh
pip install cqlsh

#Golang
sudo add-apt-repository -y ppa:longsleep/golang-backports
sudo apt-get update
sudo apt-get install -y golang-go

#go tracers and pprof
git clone https://github.com/golang/go.git
cd go/
cp -r misc $(go env GOROOT)/
sudo apt install python-pydot python-pydot-ng graphviz 
go get github.com/google/pprof
cd ..

#hey
go get -u github.com/rakyll/hey

