#!/bin/sh

command=bash

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -c|--command) command="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; shift ;;
    esac
    shift
done

docker run \
  --name os1 \
  -e "discovery.type=single-node" \
  -e "plugins.security.disabled=true" \
  -d opensearchproject/opensearch:2.9.0

docker build \
  --build-arg COMMAND="$command" \
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

status=$?

docker stop os1 -t 0
docker rm -f -v os1

return $status
