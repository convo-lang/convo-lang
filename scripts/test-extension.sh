#!/bin/bash
set -e
cd "$(dirname "$0")/.."


npx nx run convo-lang-tools:test-ext
