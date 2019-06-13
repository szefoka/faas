from node:10.16.0-alpine

#RUN mkdir /home/node
#WORKDIR /home/node
RUN npm install redis
COPY . .

CMD ["node", "--experimental-worker", "index.js"]
