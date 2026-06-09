#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# NOC Monitor — Server deployment script
#
# Run this ON YOUR SERVER (not locally) after cloning the repo:
#   git clone <your-repo> noc-monitor
#   cd noc-monitor
#   bash deploy.sh
#
# Or to update after a git pull:
#   git pull && bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

step() { echo -e "\n${BOLD}${CYAN}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠  $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }

echo ""
echo -e "${BOLD}NOC Monitor — Production Deployment${NC}"
echo "════════════════════════════════════════"

# ── Check requirements ────────────────────────────────────────────────────────
step "Checking requirements"

command -v docker >/dev/null 2>&1        || fail "Docker not found. Install: https://docs.docker.com/engine/install/"
command -v docker compose >/dev/null 2>&1 \
  || command -v docker-compose >/dev/null 2>&1 \
  || fail "Docker Compose not found."

DC="docker compose"
command -v docker compose >/dev/null 2>&1 || DC="docker-compose"

ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
ok "Docker Compose"

# ── Check .env.production ─────────────────────────────────────────────────────
step "Checking .env.production"

ENV_FILE=".env.production"

if [ ! -f "$ENV_FILE" ]; then
  cp .env.production.example "$ENV_FILE"
  echo ""
  warn "$ENV_FILE was missing — created from template."
  echo ""
  echo "  Edit $ENV_FILE and set:"
  echo "    POSTGRES_PASSWORD=<strong-password>"
  echo "    ALLOWED_ORIGINS=https://<your-domain>"
  echo ""
  echo "  Then re-run: bash deploy.sh"
  exit 0
fi

if grep -q "CHANGE_THIS_STRONG_PASSWORD" "$ENV_FILE" 2>/dev/null; then
  fail "POSTGRES_PASSWORD in $ENV_FILE is still the placeholder.\nEdit it and re-run: bash deploy.sh"
fi

ok "$ENV_FILE ready"

# ── Build Docker image ────────────────────────────────────────────────────────
step "Building Docker image (this takes ~2-3 minutes on first run)"
$DC --env-file "$ENV_FILE" build
ok "Image built"

# ── Run DB migration ─────────────────────────────────────────────────────────
step "Applying database schema"
$DC --env-file "$ENV_FILE" --profile migrate run --rm db-migrate
ok "Schema applied"

# ── Start / restart services ──────────────────────────────────────────────────
step "Starting services"
$DC --env-file "$ENV_FILE" up -d --remove-orphans
ok "Services started"

# ── Health check ─────────────────────────────────────────────────────────────
step "Waiting for app to be ready"
MAX_WAIT=60
ELAPSED=0
PORT=$(grep "^APP_PORT=" "$ENV_FILE" | cut -d= -f2)
PORT="${PORT:-5000}"

while [ $ELAPSED -lt $MAX_WAIT ]; do
  if curl -sf "http://localhost:${PORT}/api/auth/setup-status" >/dev/null 2>&1; then
    ok "App is up on port ${PORT}"
    break
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
  warn "App not responding after ${MAX_WAIT}s — check logs:"
  echo "  $DC --env-file $ENV_FILE logs app --tail=50"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Deployment complete!${NC}"
echo ""
echo "  App running on: http://localhost:${PORT}"
echo ""
echo "  Useful commands:"
echo "  $DC --env-file $ENV_FILE logs -f app          ← live logs"
echo "  $DC --env-file $ENV_FILE ps                   ← service status"
echo "  $DC --env-file $ENV_FILE restart app          ← restart app"
echo "  $DC --env-file $ENV_FILE down                 ← stop everything"
echo ""
echo "  Next: point nginx to localhost:${PORT}"
echo "  Config: nginx/noc-monitor.conf"
echo ""
