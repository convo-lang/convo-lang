#!/bin/bash

# This script creates a virtual environment, install requirements.txt and adds the paths of the
# shared iyio libraries to the created virtual environment

set -e
cd "$(dirname "$0")"

python3 -m venv venv

source venv/bin/activate

pip install -r requirements.txt

python ../../scripts/set-py-paths.py

echo 'Setup complete'
echo 'You may need to restart your code editor for changes to take effect'
