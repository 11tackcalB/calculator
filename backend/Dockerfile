# syntax=docker/dockerfile:1
# Builds either Go service. Select it with --build-arg SERVICE=calculator|gateway.

FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
ARG SERVICE
RUN test -n "$SERVICE" || (echo "build arg SERVICE is required" && exit 1)
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/service ./cmd/${SERVICE}

FROM alpine:3.24
RUN adduser -D -H -u 10001 app
USER app
COPY --from=build /out/service /usr/local/bin/service
ENTRYPOINT ["/usr/local/bin/service"]
