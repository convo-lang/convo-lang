#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

bun build *-tui.ts  --target=node --outdir ./build