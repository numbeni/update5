# NOC Monitor

## Overview
The NOC Monitor is a comprehensive website monitoring and incident detection system designed for hosting companies. It provides NOC-grade surveillance, classifying website statuses, detecting incidents, and offering diagnostic tools.

---

## Running on Replit

The **`Start application`** workflow handles everything. Just press Run.

After **frontend code changes** → rebuild then restart:
```bash
BASE_PATH=/ PORT=5000 pnpm --filter @workspace/noc-monitor run build
```
After **backend code changes** → just restart the workflow (no build needed).  
After **DB schema changes** → `pnpm --filter @workspace/db run push --force`

---

## Running Locally (Your Own Machine)

### Prerequisites

| Tool | Install |
|------|---------|
| Node.js ≥ 20 | https://nodejs.org |
| pnpm ≥ 9 | `npm install -g pnpm` |
| PostgreSQL ≥ 14 | https://www.postgresql.org/download/ |

### Step 1 — Clone

```bash
git clone <your-repo-url> noc-monitor
cd noc-monitor
```

### Step 2 — Create the database

In psql or pgAdmin:
```sql
CREATE DATABASE noc_monitor;
```

### Step 3 — Configure `.env`

```bash
cp .env.example .env
```

Edit `.env` — only one value needs changing:
```env
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/noc_monitor
PORT=5000
BASE_PATH=/
```

### Step 4 — First-time setup (run once)

```bash
bash setup.sh
```

Does everything automatically: install deps → push DB schema → build frontend.

### Step 5 — Start the app

```bash
bash dev.sh
```

Open **http://localhost:5000** — first launch shows the founder setup wizard.

### Daily workflow

```
First time only:
  cp .env.example .env      ← set your DB password
  bash setup.sh             ← install + DB + build

Every time:
  bash dev.sh               ← start

After backend changes:
  bash dev.sh               ← just restart

After frontend changes:
  BASE_PATH=/ PORT=5000 pnpm --filter @workspace/noc-monitor run build
  bash dev.sh

After DB schema changes (lib/db/src/schema/):
  pnpm --filter @workspace/db run push --force
  bash dev.sh
```

### Troubleshooting

| Error | Fix |
|-------|-----|
| `FATAL: password authentication failed` | Wrong password in `DATABASE_URL` |
| `FATAL: database does not exist` | Run `CREATE DATABASE noc_monitor;` in psql |
| `connect ECONNREFUSED 127.0.0.1:5432` | Start PostgreSQL service |
| `BASE_PATH env var required` | `.env` missing `BASE_PATH=/` |
| Port 5000 in use | Change `PORT=5000` → `PORT=3001` in `.env` (all scripts read from `.env`) |

---

## Deploying to a VPS / Web Server

The app ships as a Docker image. A single `bash deploy.sh` command handles everything on your server.

### Requirements on the server

- Ubuntu 20.04+ / Debian 11+ (or any Linux with Docker)
- Docker + Docker Compose: https://docs.docker.com/engine/install/ubuntu/
- nginx (for HTTPS / domain name): `sudo apt install nginx`
- (Optional) certbot for free SSL: `sudo apt install certbot python3-certbot-nginx`

---

### Step 1 — Clone to your server

```bash
git clone <your-repo-url> noc-monitor
cd noc-monitor
```

### Step 2 — First deploy

```bash
bash deploy.sh
```

The script:
1. Checks Docker is installed
2. Creates `.env.production` from the template (first run)
3. Tells you to fill in the password, then re-run
4. Builds the Docker image
5. Runs DB migrations
6. Starts the app + PostgreSQL containers
7. Confirms the app is healthy

On first run it will stop and ask you to fill in `.env.production`:
```bash
nano .env.production     # set POSTGRES_PASSWORD and ALLOWED_ORIGINS
bash deploy.sh           # re-run to complete
```

### Step 3 — Configure nginx

```bash
sudo cp nginx/noc-monitor.conf /etc/nginx/sites-available/noc-monitor
sudo nano /etc/nginx/sites-available/noc-monitor   # replace YOUR_DOMAIN
sudo ln -s /etc/nginx/sites-available/noc-monitor /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Step 4 — Get free SSL certificate

```bash
sudo certbot --nginx -d your-domain.com
```

That's it — your app is live at `https://your-domain.com`.

---

### Updating the app

```bash
git pull
bash deploy.sh    # rebuilds image, migrates DB, restarts containers
```

### Production commands

```bash
# View live logs
docker compose --env-file .env.production logs -f app

# Restart app only
docker compose --env-file .env.production restart app

# Stop everything
docker compose --env-file .env.production down

# Check status
docker compose --env-file .env.production ps
```

### Production files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage Docker build |
| `docker-compose.yml` | App + PostgreSQL stack |
| `nginx/noc-monitor.conf` | Nginx reverse-proxy + SSL |
| `.env.production.example` | Production env var template |
| `deploy.sh` | One-command server deployment |

---

## Architecture

```
artifacts/
  api-server/    ← Express 5 + TypeScript backend (port 5000)
  noc-monitor/   ← React 19 + Vite frontend (built once, served by backend)
lib/
  db/            ← Drizzle ORM schema + PostgreSQL client
  api-spec/      ← OpenAPI spec
  api-zod/       ← Generated Zod schemas
  api-client-react/ ← Generated React Query hooks
```

**Backend** (`artifacts/api-server`):
- Node.js + Express 5 + TypeScript, bundled with esbuild (self-contained `dist/index.mjs`)
- Auth: httpOnly cookie `noc_token` (SHA-256 hash in DB). 7-day TTL. Secure in production.
- CORS: configurable via `ALLOWED_ORIGINS` env var (defaults to open for local dev)
- Trust proxy: enabled in production for correct IP behind nginx
- `requireRole` rank: founder (40) > admin (30) > operator (20) > viewer (10)

**Frontend** (`artifacts/noc-monitor`):
- React 19 + Vite + Tailwind CSS v4 + shadcn/ui
- Built once to `dist/public/`, served statically by Express
- i18n: English + Farsi, RTL-aware (defaults to Farsi)
- Auth via httpOnly cookie — no localStorage tokens

**Database**:
- PostgreSQL via Drizzle ORM
- Tables: `users`, `sessions`, `sites`, `checks`, `incidents`, `event_logs`, `audit_logs`, `app_settings`, + more
- Indexes on all high-frequency lookup columns

---

## Auth Flow

1. App loads → `GET /api/auth/setup-status`
2. `setupRequired: true` → Setup wizard (creates founder account)
3. `setupRequired: false` → `GET /api/auth/me` (cookie auto-sent)
4. 401 → Login page
5. User returned → App shown

---

## User Preferences
- Strings shown to the user MUST go through `t("…")`. Tech terms stay English in both locales.
- After modifying `lib/db/src/schema/*`: run `pnpm --filter @workspace/db run push --force`.
- After frontend code changes: `BASE_PATH=/ PORT=5000 pnpm --filter @workspace/noc-monitor run build` then restart.
- The "Start application" workflow builds and runs everything on port 5000.
