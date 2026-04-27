#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

bun run --watch packages/convo-lang-cli/src/bin/convo.ts \
    --env .env.local \
    --api \
    --api-cors \
    --api-logging \
    --disable-api-db-auth \
    --db-map '*:mem'