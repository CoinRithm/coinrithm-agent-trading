# Hosted agent runtime (the "free run" scheduler). Stateless — every agent
# definition, state, and cycle lives in Postgres. Build context = repo root.
FROM node:20-slim AS build
WORKDIR /app

# Build the engine package first so the scheduler's file: dependency resolves to
# a ready dist (with .d.ts) and doesn't re-trigger its prepare step.
COPY packages/mcp-trading ./packages/mcp-trading
WORKDIR /app/packages/mcp-trading
RUN npm install --no-audit --no-fund && npm run build

WORKDIR /app
COPY packages/scheduler ./packages/scheduler
COPY examples ./examples
WORKDIR /app/packages/scheduler
RUN npm install --no-audit --no-fund && npm run build

ENV NODE_ENV=production
# Worker: no public port needed (set HEALTH_PORT to enable a /healthz liveness).
CMD ["node", "dist/index.js"]
