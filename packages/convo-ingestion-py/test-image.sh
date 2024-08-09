#!/bin/bash

# Builds and runs

set -e
cd "$(dirname "$0")"

./build-image.sh

export DOCKER_DEFAULT_PLATFORM=linux/amd64

if [ "$1" == '--shell' ]
then
    docker run -it --rm --entrypoint /bin/bash -p "8080:8080" convo-ingestion-py
else
    docker run -it --rm -p "8080:8080" convo-ingestion-py
fi
