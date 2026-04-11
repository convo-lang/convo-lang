#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

npx nx run-many --target=build
