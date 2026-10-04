#!/bin/sh
set -u

(
  cd /workspace/uis/website
  exec ./node_modules/.bin/next dev --hostname 0.0.0.0 --port 3000
) &
website_pid=$!

(
  cd /workspace/uis/backoffice
  exec ./node_modules/.bin/next dev --webpack --hostname 0.0.0.0 --port 3001
) &
backoffice_pid=$!

stop_apps() {
  kill "$website_pid" "$backoffice_pid" 2>/dev/null || true
}

trap stop_apps INT TERM
set +e
wait -n "$website_pid" "$backoffice_pid"
status=$?
stop_apps
wait "$website_pid" "$backoffice_pid" 2>/dev/null
exit "$status"