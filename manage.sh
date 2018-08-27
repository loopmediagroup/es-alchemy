#!/bin/sh

sudo docker run \
  --name es63 \
  -d docker.elastic.co/elasticsearch/elasticsearch:6.3.0

sudo docker build -t lambda-environment-node -f docker/Dockerfile . &&
sudo docker run \
  --link es63:elasticsearch \
  -u=$UID:$(id -g $USER) \
  -v $(pwd):/user/project \
  -v ~/.aws:/user/.aws \
  -v ~/.npmrc:/user/.npmrc \
  -it lambda-environment-node

sudo docker stop es63 -t 0
sudo docker rm -f es63
