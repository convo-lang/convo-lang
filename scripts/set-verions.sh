#!/bin/bash
set -e
cd "$(dirname "$0")/.."

VERSION=$1

if [ "$VERSION" == "" ]; then
    VERSION='+0.0.1'
fi

scripts/build-all.sh

node tools/scripts/set-all-versions.mjs "$VERSION"
