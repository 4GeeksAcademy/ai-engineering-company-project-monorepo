#!/usr/bin/env bash
# =============================================================================
#  Brasaland — Start all services (API + UI)
#  Usage: ./scripts/start-all.sh
# =============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/services/api"
UI_DIR="$ROOT/uis/backoffice"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

cleanup() {
  echo ""
  echo -e "${RED}Shutting down all services...${NC}"
  [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null && echo -e "  ${RED}✗ API stopped${NC}"
  [[ -n "${UI_PID:-}" ]] && kill "$UI_PID" 2>/dev/null && echo -e "  ${RED}✗ UI stopped${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  BRASALAND — Starting all services${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# --- API ---
echo -e "${GREEN}▸ Starting API (FastAPI)...${NC}"
cd "$API_DIR"
uvicorn app.main:app --reload --port 8000 &
API_PID=$!
echo -e "  PID: $API_PID"

# --- UI ---
echo -e "${GREEN}▸ Starting UI (Next.js)...${NC}"
cd "$UI_DIR"
npm run dev &
UI_PID=$!
echo -e "  PID: $UI_PID"

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${GREEN}✓ API running at  http://localhost:8000${NC}"
echo -e "${GREEN}✓ UI running at   http://localhost:3000${NC}"
echo -e "${CYAN}============================================${NC}"
echo -e "Press ${RED}Ctrl+C${NC} to stop all services."
echo ""

wait
