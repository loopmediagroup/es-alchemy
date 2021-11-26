#!/bin/sh

docker run \
  --name es710 \
  -e "discovery.type=single-node" \
  -d docker.elastic.co/elasticsearch/elasticsearch:7.10.0

docker build \
  -t lambda-environment-node \
  --network="host" \
  -f docker/Dockerfile \
  . &&
docker run \
  --link es710:elasticsearch \
  -u`id -u`:`id -g` \
  -v $(pwd):/user/project \
  -v ~/.aws:/user/.aws \
  -v ~/.npmrc:/user/.npmrc \
  -it lambda-environment-node

docker stop es710 -t 0
docker rm -f es710
