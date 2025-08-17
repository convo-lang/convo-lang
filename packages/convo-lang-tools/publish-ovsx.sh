#!/bin/bash
set -e
cd "$(dirname "$0")"

cd lsp
./build-lsp.sh
cd ..

echo 'export const extensionPublisher="convo-lang";' > lsp/client/src/build-const.ts
sed -i 's/"publisher": "IYIO",/"publisher": "convo-lang",/g' filename.txt

# How to create a new personal access token:
# - goto https://open-vsx.org/user-settings/tokens
echo token=$OPEN_VSX_TOKEN
npx --yes ovsx publish -p $OPEN_VSX_TOKEN

echo 'export const extensionPublisher="iyio";' > lsp/client/src/build-const.ts
sed -i 's/"publisher": "convo-lang",/"publisher": "IYIO",/g' filename.txt
