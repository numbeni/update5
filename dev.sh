#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# NOC Monitor — Start development server
# Run after setup.sh:
#   bash dev.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ── Check .env ────────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  fail ".env not found. Run setup first:\n  bash setup.sh"
fi

# Load .env
set -a
# shellcheck disable=SC1091
source .env
set +a

PORT="${PORT:-5000}"

# ── Check setup was done ──────────────────────────────────────────────────────
if [ ! -f "artifacts/noc-monitor/dist/public/index.html" ]; then
  echo -e "${RED}✗ Frontend not built. Run setup first:${NC}"
  echo "  bash setup.sh"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo -e "${RED}✗ Dependencies not installed. Run setup first:${NC}"
  echo "  bash setup.sh"
  exit 1
fi

echo -e "${GREEN}${BOLD}Starting NOC Monitor on http://localhost:${PORT}${NC}"
echo "  Press Ctrl+C to stop"
echo ""

PORT="$PORT" pnpm --filter @workspace/api-server run dev
