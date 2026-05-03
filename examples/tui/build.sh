#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

bun build *-tui.ts  --outdir ./build --target=node --format cjs