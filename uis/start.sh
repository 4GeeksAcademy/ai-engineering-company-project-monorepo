#!/bin/sh
# ── TrackFlow UIS – Parallel Next.js Launcher ──────────────────────────
# Starts both `website` (port 3000) and `backoffice` (port 3001)
# in the background and waits for all of them.

set -e

echo ">>> Starting TrackFlow UIS..."
echo "    website   → http://localhost:3000"
echo "    backoffice → http://localhost:3001"
echo ""

# ── Launch apps in parallel ─────────────────────────────────────────────
cd /app/website    && PORT=3000  npx next dev &
pid_website=$!

cd /app/backoffice && PORT=3001  npx next dev &
pid_backoffice=$!

# ── Graceful shutdown trap ──────────────────────────────────────────────
trap 'echo ""; echo ">>> Shutting down..."; kill "$pid_website" "$pid_backoffice" 2>/dev/null; exit' SIGTERM SIGINT SIGQUIT

# ── Wait for any child to exit ──────────────────────────────────────────
wait