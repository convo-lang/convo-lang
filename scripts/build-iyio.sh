#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

pushd ../iyio-common
rm -rf dist
pkij --build $@
cp -r dist/packages/iyio-common dist/packages/common

popd

rm -rf node_modules/@iyio
mkdir -p node_modules
cp -r ../iyio-common/dist/packages node_modules/@iyio

rm -rf examples/nextjs-tailwinds/.next
# touching the next.config.ts file restarts the next server
touch examples/nextjs-tailwinds/next.config.ts
