#!/bin/sh

docker run \
  --name os1 \
  -e "discovery.type=single-node" \
  -e "plugins.security.disabled=true" \
  -d opensearchproject/opensearch:2.7.0

docker build \
  -t lambda-environment-node \
  --network="host" \
  docker/. &&
docker run \
  --link os1:opensearch \
  -u`id -u`:`id -g` \
  -v $(pwd):/user/project \
  -v ~/.aws:/user/.aws \
  -v ~/.npmrc:/user/.npmrc \
  -it lambda-environment-node

docker stop os1 -t 0
docker rm -f -v os1
