# Hosted agent runtime (the "free run" scheduler). Stateless — every agent
# definition, state, and cycle lives in Postgres. Build context = repo root.
# Node 20 reached end of life on 2026-04-30; the suite runs on Node 24.
FROM node:24-slim AS build
WORKDIR /app

# Build the engine package first so the scheduler's file: dependency resolves to
# a ready dist (with .d.ts) and doesn't re-trigger its prepare step.
COPY packages/mcp-trading ./packages/mcp-trading
WORKDIR /app/packages/mcp-trading
RUN npm ci --no-audit --no-fund && npm run build

WORKDIR /app
COPY packages/scheduler ./packages/scheduler
COPY examples ./examples
WORKDIR /app/packages/scheduler
RUN npm ci --no-audit --no-fund && npm run build

# Runtime needs only production dependencies of both packages (the engine is a
# file: dependency, linked from ../mcp-trading).
RUN npm prune --omit=dev --no-audit --no-fund   && npm --prefix /app/packages/mcp-trading prune --omit=dev --no-audit --no-fund

ENV NODE_ENV=production
# Heartbeat-aware liveness: the endpoint returns 200 only while the poll loop is
# ticking, so the orchestrator restarts a HUNG scheduler, not just a crashed one.
ENV HEALTH_PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD node -e "const r=require('http').get('http://127.0.0.1:8080/healthz',x=>process.exit(x.statusCode===200?0:1));r.on('error',()=>process.exit(1));r.setTimeout(4000,()=>process.exit(1))"
# The image's built-in unprivileged user; state lives in Postgres, not on disk.
USER node
CMD ["node", "dist/index.js"]
