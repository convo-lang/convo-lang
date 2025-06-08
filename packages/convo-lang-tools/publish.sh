#!/bin/bash
set -e
cd "$(dirname "$0")"

cd lsp
./build-lsp.sh
cd ..

# How to create a new personal access token:
# - goto https://dev.azure.com/phillsv87/_usersSettings/tokens and sign-in with logic email
# - Click on the user gear icon then click on Personal access token
# - Click create new token
# - give full access

# See https://code.visualstudio.com/api/working-with-extensions/publishing-extension
echo token=$VS_CODE_TOKEN
npx --yes vsce publish -p $VS_CODE_TOKEN
