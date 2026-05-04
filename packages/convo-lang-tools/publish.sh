#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

cd lsp
./build-lsp.sh
cd ../dist

# How to create a new personal access token:
# - goto https://dev.azure.com/phillsv87/_usersSettings/tokens and sign-in with logic email
# - Click on the user gear icon then click on Personal access token
# - Click create new token
# - give full access

# See https://code.visualstudio.com/api/working-with-extensions/publishing-extension
# https://marketplace.visualstudio.com/manage/publishers/iyio/extensions/convo-lang-tools/hub?_a=review
echo token=$VS_CODE_TOKEN
bunx --yes @vscode/vsce publish -p $VS_CODE_TOKEN
