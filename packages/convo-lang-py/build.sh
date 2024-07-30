#!/bin/bash
set -e
pushd "$(dirname "$0")/../../"


npx nx run convo-lang-cli:build && cp dist/packages/convo-lang-cli/bin/convo.js packages/convo-py/src/convo_lang/convo.js

popd
pwd

rm -rf ./dist
python3 -m build
