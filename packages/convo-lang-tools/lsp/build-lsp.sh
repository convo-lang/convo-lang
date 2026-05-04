#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if [ ! -d 'server/node_modules' ]; then
    cd server
    npm i
    cd ..
fi
if [ ! -d 'client/node_modules' ]; then
    cd client
    npm i
    cd ..
fi

npx esbuild \
    server/src/server.ts \
    --platform=node \
    --format=cjs \
    --bundle \
    --minify \
    --tree-shaking=true\
    --external:'vscode' \
    --external:'bun' \
    --external:'bun:sqlite' \
    --external:'path' \
    --external:'vscode-languageserver-textdocument' \
    --external:'vscode-languageserver' \
    --external:'vscode-languageserver' \
    --external:'fsevents' \
    --external:'typescript' \
    --external:'shiki' \
    --outfile=server/out/server.js

npx esbuild \
    client/src/extension.ts \
    --platform=node \
    --format=cjs \
    --minify \
    --tree-shaking=true\
    --bundle \
    --external:'vscode' \
    --external:'bun' \
    --external:'bun:sqlite' \
    --external:'path' \
    --external:'vscode-languageserver-textdocument' \
    --external:'vscode-languageserver' \
    --external:'fsevents' \
    --metafile=meta.json \
    --external:'typescript' \
    --external:'shiki' \
    --outfile=client/out/extension.js

cd ..

rm -rf ./dist
mkdir -p ./dist/lsp/client/out
mkdir -p ./dist/lsp/server/out
cp lsp/client/out/extension.js ./dist/lsp/client/out/extension.js
cp lsp/server/out/server.js ./dist/lsp/server/out/server.js
cp -r ./assets ./dist/assets
cp -r ./syntaxes ./dist/syntaxes
cp ./lsp/client/package.json ./dist/lsp/client/package.json
cp ./lsp/server/package.json ./dist/lsp/server/package.json
cp ./convo-language-configuration.json ./dist/convo-language-configuration.json
cp ./LICENSE ./dist/LICENSE
cp ./package.json ./dist/package.json
cp ./README.md ./dist/README.md
touch ./dist/.vscodeignore