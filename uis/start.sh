#!/bin/sh
set -e

cd /app/website
npm run start -- --hostname 0.0.0.0 --port 3000 &

cd /app/backoffice
npm run start -- --hostname 0.0.0.0 --port 3001 &

wait
