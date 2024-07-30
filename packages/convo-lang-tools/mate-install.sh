#!/bin/bash
set -e
cd "$(dirname "$0")"

./mate-build.sh

DEST="$HOME/Library/Application Support/TextMate/Managed/Bundles/convo.tmbundle"

rm -rf "$DEST"

cp -rv mate/convo.tmbundle "$DEST"
