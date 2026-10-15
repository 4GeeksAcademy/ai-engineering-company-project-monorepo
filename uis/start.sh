#!/bin/sh
# Starts both interfaces in one container: website (:3000) and backoffice (:3001), hot reload on.
# website is a Vite app (uis/website); backoffice is Next.js (uis/backoffice).
cd /app

npm --workspace uis/website exec -- vite --host 0.0.0.0 --port 3000 --strictPort &
WEBSITE_PID=$!
npm --workspace uis/backoffice exec -- next dev -H 0.0.0.0 -p 3001 &
BACKOFFICE_PID=$!

trap 'kill $WEBSITE_PID $BACKOFFICE_PID 2>/dev/null; exit 0' TERM INT

# If either app dies, stop the container so Docker shows it instead of half a stack.
while kill -0 $WEBSITE_PID 2>/dev/null && kill -0 $BACKOFFICE_PID 2>/dev/null; do
  sleep 2
done
kill $WEBSITE_PID $BACKOFFICE_PID 2>/dev/null
exit 1
