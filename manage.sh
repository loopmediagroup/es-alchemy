#!/bin/sh

docker run \
  --name es63 \
  -d docker.elastic.co/elasticsearch/elasticsearch:6.5.0

docker build -t lambda-environment-node -f docker/Dockerfile . &&
docker run \
  --link es63:elasticsearch \
  -u`id -u`:`id -g` \
  -v $(pwd):/user/project \
  -v ~/.aws:/user/.aws \
  -v ~/.npmrc:/user/.npmrc \
  -it lambda-environment-node

docker stop es63 -t 0
docker rm -f es63
