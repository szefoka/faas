from node:10.16.0-alpine

#RUN mkdir /home/node
#WORKDIR /home/node
RUN npm install redis
RUN npm install uuid
RUN npm install cassandra-driver
RUN npm install mongodb --save
COPY . .

CMD ["node", "--experimental-worker", "index.js"]
