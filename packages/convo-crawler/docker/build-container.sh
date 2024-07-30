#!/bin/bash
set -e

docker build -t convo-web .. -f Dockerfile
