#!/usr/bin/env bash
# Start the Brasaland class-demo stack: Qdrant, optional RAG index, FastAPI.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-8000}"
HOST="${HOST:-127.0.0.1}"

echo "==> Qdrant"
if command -v docker >/dev/null 2>&1; then
    docker compose up -d qdrant || echo "Could not start Qdrant with Docker. Knowledge chat needs localhost:6333."
else
    echo "Docker is not available. Start Qdrant on localhost:6333 yourself if you need knowledge chat."
fi

qdrant_ready=0
if command -v uv >/dev/null 2>&1; then
    for _ in 1 2 3 4 5 6 7 8 9 10; do
        if uv run python scripts/check_qdrant_connectivity.py; then
            qdrant_ready=1
            break
        fi
        sleep 2
    done
    if [[ "$qdrant_ready" -eq 1 ]]; then
        echo "==> Index knowledge base (skip if embedding keys are missing)"
        uv run python data/process/rag.py || echo "RAG index skipped. Knowledge chat will not retrieve until indexing succeeds."
    else
        echo "Qdrant is not reachable. Knowledge chat will wait until it is up."
    fi
    echo "==> API + guest site + staff UIs"
    echo "Public Pages (menu photos): https://rickycastro1940.github.io/ai-engineering-company-project-monorepo/menu.html"
    echo "Local home:     http://${HOST}:${PORT}/"
    echo "Menu:           http://${HOST}:${PORT}/menu.html"
    echo "Backoffice:     http://${HOST}:${PORT}/backoffice/   (mariana / brasaland)"
    echo "Knowledge:      http://${HOST}:${PORT}/knowledge/"
    echo "Incidents:      http://${HOST}:${PORT}/incidents/"
    echo "n8n import:     workflows/brasaland-weekly-kpi/brasaland-weekly-kpi.json"
    exec uv run uvicorn api.app:app --host "$HOST" --port "$PORT"
fi

echo "uv is not installed. Install from https://docs.astral.sh/uv/ then re-run this script."
exit 1
