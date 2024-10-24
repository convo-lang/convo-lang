#!/bin/bash
set -e
cd "$(dirname "$0")"

currentDir=$(pwd)
name=$(basename "$currentDir")

buildName="tmp-$name-$(date +%s)"
dockerFile="../../$buildName.Dockerfile"
dockerIgnore="../../$buildName.Dockerfile.dockerignore"

cp Dockerfile "$dockerFile"
cp .dockerignore "$dockerIgnore"

docker build --platform linux/amd64 -t "$name" -f "$dockerFile" ../..

rm "$dockerFile"
rm "$dockerIgnore"
