# Glama / generic hosted build entrypoint for the CoinRithm trading MCP server.
# The implementation lives in packages/mcp-trading; this root Dockerfile keeps
# registry hosts that expect a repository-root Dockerfile from needing subfolder
# build configuration.

# Node 20 reached end of life on 2026-04-30; the suite runs on Node 24.
FROM node:24-slim

WORKDIR /app/packages/mcp-trading

# Install deps first for layer caching. The package prepare hook builds with
# tsc, so skip scripts until src/ and tsconfig.json are present.
COPY packages/mcp-trading/package.json packages/mcp-trading/package-lock.json ./
RUN npm ci --ignore-scripts

COPY packages/mcp-trading/tsconfig.json ./
COPY packages/mcp-trading/src ./src
RUN npm run build

RUN npm prune --omit=dev

ENV NODE_ENV=production
ENV COINRITHM_API_URL=https://api.coinrithm.com
ENV PORT=8787
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "const r=require('http').get('http://127.0.0.1:'+(process.env.PORT||8787)+'/healthz',x=>process.exit(x.statusCode===200?0:1));r.on('error',()=>process.exit(1));r.setTimeout(4000,()=>process.exit(1))"
USER node

CMD ["node", "dist/http.js"]
