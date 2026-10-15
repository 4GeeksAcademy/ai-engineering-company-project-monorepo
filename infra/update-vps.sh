#!/bin/sh
# Updates the stack on the server after a `git pull`: sets DEV_ALLOWED_ORIGINS in .env and rebuilds.
# Usage (from the repo root on the server): sh infra/update-vps.sh <public-ip-or-domain>
set -eu
HOST="${1:?usage: sh infra/update-vps.sh <public-ip-or-domain>}"
[ -f .env ] || { echo "No .env here: run this from the repository root." >&2; exit 1; }

if grep -q '^DEV_ALLOWED_ORIGINS=' .env; then
  sed -i "s|^DEV_ALLOWED_ORIGINS=.*|DEV_ALLOWED_ORIGINS=$HOST|" .env
else
  echo "DEV_ALLOWED_ORIGINS=$HOST" >> .env
fi

docker compose up -d --build
docker compose ps
