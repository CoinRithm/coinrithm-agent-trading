# Hosted, multi-user CoinRithm trading MCP server (Streamable HTTP).
# Behind https://mcp.coinrithm.com/mcp. Each request carries the caller's OWN
# crk_live_… key in its Authorization header — there is NO baked-in API key.
#
# Build:  docker build -t coinrithm-mcp .
# Run:    docker run -p 8787:8787 -e COINRITHM_API_URL=https://api.coinrithm.com coinrithm-mcp

# Node 20 reached end of life on 2026-04-30; the suite runs on Node 24.
FROM node:24-slim

WORKDIR /app

# Install deps first for layer caching. We need devDependencies (typescript)
# to compile, so do NOT pass --omit=dev here. --ignore-scripts skips the package
# "prepare" hook (which runs `npm run build`); src/ and tsconfig.json are not
# present yet at this layer, so we build explicitly below once they are copied.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

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

# /healthz answers 503 while a stop signal drains open requests
# (src/httpShutdown.ts), so a stopping container reports unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "const r=require('http').get('http://127.0.0.1:'+(process.env.PORT||8787)+'/healthz',x=>process.exit(x.statusCode===200?0:1));r.on('error',()=>process.exit(1));r.setTimeout(4000,()=>process.exit(1))"

# The image's built-in unprivileged user; nothing here writes to disk.
USER node

# Run the HTTP (multi-user) entry. NOT index.js (that is the single-user stdio path).
CMD ["node", "dist/http.js"]
