#!/bin/bash
set -e
cd "$(dirname "$0")"

cd lsp
./build-lsp.sh
cd ..

# See https://code.visualstudio.com/api/working-with-extensions/publishing-extension
echo token=$VS_CODE_TOKEN
vsce publish -p $VS_CODE_TOKEN
