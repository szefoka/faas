FROM golang:1.10.4-alpine3.8 as build

RUN mkdir -p /go/src/handler
WORKDIR /go/src/handler
COPY . .
RUN apk add git
RUN go get -u github.com/go-redis/redis
RUN go build gows.go

FROM alpine:3.8
# Add non root user and certs
RUN apk --no-cache add ca-certificates \
    && addgroup -S app && adduser -S -g app app \
    && mkdir -p /home/app \
    && chown app /home/app

WORKDIR /home/app

COPY --from=build /go/src/handler/gows    .

RUN chown -R app /home/app
USER app
CMD ["./gows"]

