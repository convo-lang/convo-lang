#!/bin/bash
set -e
cd "$(dirname "$0")/.."

NAME=$1

if [ "$NAME" == "" ]; then
    echo 'First arg should be name of package to create'
    exit 1
fi

npx ts-node \
    -r tsconfig-paths/register \
    --project packages/tmpl-gen/tsconfig.lib.json packages/tmpl-gen/src/bin/process-tmpl-dir.ts \
    --template pkg \
    --template-dir ../iyio-common/tmpl \
    --out "packages/$NAME" \
    --invoke "name:$NAME,namespace:convo-lang"

