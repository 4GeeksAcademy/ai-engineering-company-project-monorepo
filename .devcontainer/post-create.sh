#!/usr/bin/env bash
set -euo pipefail

# Enable Corepack and make pnpm available for JS/TS workspaces.
corepack enable || true
corepack prepare pnpm@latest --activate || true

# Upgrade pip and install a baseline Python toolset used in this template.
python -m pip install --upgrade pip
python -m pip install pandas fastapi uvicorn[standard] pytest

echo "Devcontainer setup complete."
