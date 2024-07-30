#!/bin/bash
set -e

#docker run --rm --name convo-web --shm-size=2gb -p 5900:5900 -p 7000:7000 -e VNC_SERVER_PASSWORD=password --user apps convo-web

#docker run --rm --name convo-web -p 5900:5900 -p 5910:5910 -e VNC_SERVER_PASSWORD=password -e CONVO_AGENT_TUNNEL_PREFIX=test-local --user apps convo-web

docker run --rm --name convo-web -p 5900:5900 -p 5910:5910 -e VNC_SERVER_PASSWORD=password -e CONVO_AGENT_TUNNEL_PREFIX=test-local convo-web
