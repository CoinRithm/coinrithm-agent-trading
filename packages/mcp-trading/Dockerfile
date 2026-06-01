# Hosted, multi-user CoinRithm trading MCP server (Streamable HTTP).
# Behind https://mcp.coinrithm.com/mcp. Each request carries the caller's OWN
# crk_live_… key in its Authorization header — there is NO baked-in API key.
#
# Build:  docker build -t coinrithm-mcp .
# Run:    docker run -p 8787:8787 -e COINRITHM_API_URL=https://api.coinrithm.com coinrithm-mcp

FROM node:20-slim

WORKDIR /app

# Install deps first for layer caching. We need devDependencies (typescript)
# to compile, so do NOT pass --omit=dev here.
COPY package.json package-lock.json ./
RUN npm ci

# Build TypeScript -> dist/
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Drop dev dependencies to slim the runtime image (keep prod deps only).
RUN npm prune --omit=dev

ENV NODE_ENV=production
# Upstream CoinRithm API. Override per environment if needed.
ENV COINRITHM_API_URL=https://api.coinrithm.com
# HTTP port the Streamable-HTTP server listens on. Coolify maps its domain here.
ENV PORT=8787
EXPOSE 8787

# Run the HTTP (multi-user) entry. NOT index.js (that is the single-user stdio path).
CMD ["node", "dist/http.js"]
