#!/bin/bash
set -e
cd "$(dirname "$0")/.."

npx nx run convo-crawler:build

mkdir -p dist-cached/packages/convo-crawler/bin/
cp -v dist/packages/convo-crawler/bin/convo-web.js dist-cached/packages/convo-crawler/bin/convo-web.js
