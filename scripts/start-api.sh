#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

bun run --watch packages/convo-lang-cli/src/bin/convo.ts --api --env .env.local --api-cors --api-logging