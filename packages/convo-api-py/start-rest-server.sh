#!/bin/bash

# Builds and runs

set -e
cd "$(dirname "$0")"

set -o allexport

if [ -d "/secrets" ]; then
    for filename in /secrets/.env*; do
        echo "source $filename"
        source $filename
    done
fi
if [ -d "/local-config" ]; then
    for filename in /local-config/.env*; do
        echo "source $filename"
        source $filename
    done
fi

set +o allexport

if [ "$CONVO_API_PY_HOT_RELOAD" == "true" ]; then
    py-hot-reload src/rest_api.py
else
    python src/rest_api.py
fi
