#!/bin/bash
set -e
cd "$(dirname "$0")"


rm -rf ./mate/convo.tmbundle/Syntaxes/convo.tmLanguage
rm -rf ./mate-out
mkdir -p ./mate-out

plutil -convert xml1 syntaxes/convo.tmLanguage.json -o ./mate/convo.tmbundle/Syntaxes/convo.tmLanguage

cd ./mate
tar -czvf ../mate-out/convo.tmLanguage.tar.gz convo.tmbundle
