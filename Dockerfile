# ─────────────────────────────────────────────────────────────────────────────
# NOC Monitor — Multi-stage Docker build
#
# Stage 1 (builder): installs deps, builds frontend + backend
# Stage 2 (runner):  lean production image — only the compiled output
#
# Build:
#   docker build -t noc-monitor .
#
# Run (standalone, no docker-compose):
#   docker run -d \
#     -e DATABASE_URL=postgresql://user:pass@host:5432/noc_monitor \
#     -e NODE_ENV=production \
#     -p 5000:5000 \
#     noc-monitor
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests first (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY tsconfig.base.json tsconfig.json ./
COPY lib/db/package.json                         lib/db/
COPY lib/api-spec/package.json                   lib/api-spec/
COPY lib/api-zod/package.json                    lib/api-zod/
COPY lib/api-client-react/package.json           lib/api-client-react/
COPY artifacts/api-server/package.json           artifacts/api-server/
COPY artifacts/noc-monitor/package.json          artifacts/noc-monitor/

# Install all deps (including dev — needed for builds)
RUN pnpm install --frozen-lockfile

# Copy source
COPY lib/       lib/
COPY artifacts/ artifacts/
COPY attached_assets/ attached_assets/

# Build frontend
ARG BASE_PATH=/
ARG PORT=5000
ENV BASE_PATH=${BASE_PATH}
ENV PORT=${PORT}
RUN pnpm --filter @workspace/noc-monitor run build

# Build backend
RUN pnpm --filter @workspace/api-server run build


# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Non-root user for security
RUN addgroup -S noc && adduser -S noc -G noc

WORKDIR /app

# Backend bundle (self-contained — no node_modules needed)
COPY --from=builder --chown=noc:noc /app/artifacts/api-server/dist  ./artifacts/api-server/dist

# Frontend static files
COPY --from=builder --chown=noc:noc /app/artifacts/noc-monitor/dist/public  ./artifacts/noc-monitor/dist/public

USER noc

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
