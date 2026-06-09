#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# NOC Monitor — One-time local setup
# Run this ONCE after cloning or whenever you update schema/deps:
#   bash setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step() { echo -e "\n${BOLD}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }

echo -e "${BOLD}NOC Monitor — Setup${NC}"
echo "────────────────────────────────────────"

# ── 1. Check prerequisites ────────────────────────────────────────────────────
step "Checking prerequisites"

command -v node >/dev/null 2>&1 || fail "Node.js not found. Install from https://nodejs.org (version ≥ 20)"
NODE_VER=$(node -e "process.stdout.write(process.version)")
ok "Node.js $NODE_VER"

command -v pnpm >/dev/null 2>&1 || fail "pnpm not found. Run: npm install -g pnpm"
PNPM_VER=$(pnpm --version)
ok "pnpm $PNPM_VER"

# ── 2. Check .env ─────────────────────────────────────────────────────────────
step "Checking .env file"

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  warn ".env file was missing — created from .env.example"
  echo ""
  echo "  Please edit .env and set your PostgreSQL connection string:"
  echo "  DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/noc_monitor"
  echo ""
  echo "  Then re-run: bash setup.sh"
  exit 0
fi

# Check DATABASE_URL is set and not the placeholder
if grep -q "yourpassword" .env 2>/dev/null; then
  echo ""
  fail "DATABASE_URL in .env still has placeholder password.\nEdit .env and set the correct DATABASE_URL, then re-run: bash setup.sh"
fi

ok ".env found"

# Load .env for use in this script
set -a
# shellcheck disable=SC1091
source .env
set +a

# ── 3. Install dependencies ───────────────────────────────────────────────────
step "Installing dependencies"
pnpm install
ok "Dependencies installed"

# ── 4. Push database schema ───────────────────────────────────────────────────
step "Pushing database schema (Drizzle)"
echo "  Connecting to: ${DATABASE_URL%%@*}@..."
pnpm --filter @workspace/db run push-force
ok "Database schema applied"

# ── 5. Build frontend ─────────────────────────────────────────────────────────
step "Building frontend"
BASE_PATH=/ PORT="${PORT:-5000}" pnpm --filter @workspace/noc-monitor run build
ok "Frontend built"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Setup complete!${NC}"
echo ""
echo "  To start the app, run:"
echo -e "  ${BOLD}bash dev.sh${NC}"
echo ""
echo "  Then open: http://localhost:${PORT:-5000}"
echo ""
