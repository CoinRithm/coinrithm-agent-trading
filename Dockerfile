# Glama / generic hosted build entrypoint for the CoinRithm trading MCP server.
# The implementation lives in packages/mcp-trading; this root Dockerfile keeps
# registry hosts that expect a repository-root Dockerfile from needing subfolder
# build configuration.

FROM node:20-slim

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

CMD ["node", "dist/http.js"]
