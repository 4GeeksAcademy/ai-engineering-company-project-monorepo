#!/usr/bin/env bash
# Serve the Brasaland public site on port 3000 (Codespaces-compatible).
# Bind 0.0.0.0 so GitHub Codespaces can forward the port.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Serving Brasaland from ${ROOT} on http://0.0.0.0:3000/"
echo "Landing: /   Supplier form: /application.html   Guest site: /uis/website/"

if [[ -n "${CODESPACE_NAME:-}" ]]; then
  echo "Codespaces public URL (after Port visibility = Public):"
  echo "  https://${CODESPACE_NAME}-3000.app.github.dev/"
  echo "  https://${CODESPACE_NAME}-3000.app.github.dev/application.html"
  if command -v gh >/dev/null 2>&1; then
    gh codespace ports visibility 3000:public -c "$CODESPACE_NAME" || true
  fi
fi

exec npx --yes http-server . -p 3000 -a 0.0.0.0 -c-1
