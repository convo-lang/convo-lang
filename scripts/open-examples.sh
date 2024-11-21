#!/bin/bash
set -e
cd "$(dirname "$0")/.."


for d in ./examples/*/ ; do
    code $d
done
