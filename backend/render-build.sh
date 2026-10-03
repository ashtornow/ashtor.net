#!/usr/bin/env bash
# Build script for deploying the FastAPI backend on Render.
#
# `emergentintegrations` is not published on public PyPI and it pins `litellm`
# through a different direct-URL than requirements.txt, which makes a plain
# `pip install -r requirements.txt` fail with a dependency-resolution conflict.
# We install every other dependency first, then add emergentintegrations with
# --no-deps from Emergent's package index so its litellm pin is not re-resolved.
set -o errexit

python -m pip install --upgrade pip

# Install all requirements except emergentintegrations.
grep -v '^emergentintegrations==' requirements.txt > /tmp/render_reqs.txt
pip install -r /tmp/render_reqs.txt

# Add emergentintegrations without pulling its conflicting litellm URL.
pip install --no-deps emergentintegrations==0.2.0 \
  --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
