#!/usr/bin/env bash
# End-to-end smoke test for the Brasaland RAG milestone.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Syncing dependencies"
uv sync

echo "==> Checking Qdrant connectivity"
uv run python scripts/check_qdrant_connectivity.py

echo "==> Running unit tests"
uv run python -m pytest tests/pipelines/test_rag.py tests/api/test_knowledge_router.py -q

echo "==> Indexing knowledge base"
uv run python data/process/rag.py

echo ""
echo "Smoke test passed. Start the API with:"
echo "  cd services/api && uv run uvicorn api.app:app --reload"
echo "Then open http://localhost:8000/knowledge/"
