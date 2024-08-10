#!/bin/bash
set -e
cd "$(dirname "$0")"

pip freeze > ./requirements.txt
