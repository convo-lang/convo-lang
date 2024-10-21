#!/bin/bash

# Builds and runs

set -e
cd "$(dirname "$0")"

if [ "$CONVO_API_PY_HOT_RELOAD" == "true" ]; then
    py-hot-reload src/convo/rest_api.py
else
    python src/convo/rest_api.py
fi
