# Deploy: hosted MCP at `mcp.coinrithm.com`

Runbook for the **multi-user, hosted** CoinRithm trading MCP server. Users point
their MCP client at `https://mcp.coinrithm.com/mcp` and authenticate with
**their own** `crk_live_…` key in the `Authorization` header. The server holds
**no** API key — it reads each request's key and forwards it upstream.

> Single-user local use does **not** need this. For Claude Desktop / Cursor /
> Codex on one machine, use the stdio path (`npx -y @coinrithm/mcp-trading`),
> which keeps using the `COINRITHM_API_KEY` env var. This runbook is only for the
> shared hosted endpoint.

---

## What ships

- **Entry:** `dist/http.js` (Streamable HTTP). **Not** `dist/index.js` (stdio).
- **Endpoint:** `POST /mcp` (+ unauthenticated `GET /healthz` liveness).
- **Auth model:** per request. `Authorization: Bearer crk_live_…` is read off the
  incoming request and forwarded as the upstream `Authorization` to
  `/api/agent/*`. No global key. A request with no Authorization header gets a
  clean `401` before any MCP work.

## Environment

| Var | Value | Required | Notes |
| --- | --- | --- | --- |
| `PORT` | `8787` | no (default `8787`) | Port the HTTP server listens on; Coolify routes the domain here. |
| `COINRITHM_API_URL` | `https://api.coinrithm.com` | no (default prod) | Upstream API base. |
| `COINRITHM_API_KEY` | — | **no** | **Do NOT set.** Ignored by the HTTP entry; keys arrive per request. |

## Build the image

```bash
# from packages/mcp-trading/
docker build -t coinrithm-mcp .
```

The `Dockerfile` (node:20-slim) runs `npm ci`, copies `src` + `tsconfig.json`,
runs `npm run build`, prunes dev deps, exposes `8787`, and launches
`node dist/http.js`.

## Deploy via Coolify

1. **New resource → Docker image / Dockerfile**, pointed at this directory
   (`packages/mcp-trading`) or a prebuilt `coinrithm-mcp` image.
2. **Env:** set `PORT=8787` and `COINRITHM_API_URL=https://api.coinrithm.com`.
   Leave `COINRITHM_API_KEY` **unset**.
3. **Port mapping:** expose container port **8787**.
4. **Domain:** add `mcp.coinrithm.com` and route it to the container. MCP clients
   connect to the `/mcp` path, so the public URL is
   `https://mcp.coinrithm.com/mcp`. (No special path rewrite needed — the app
   serves `/mcp` and `/healthz` directly.)
5. **TLS:** let Coolify/Traefik terminate HTTPS for `mcp.coinrithm.com`.
6. **Health check:** `GET /healthz` returns `{"ok":true,...}` — use it as the
   container/uptime probe (it needs no auth).
7. Deploy.

## Smoke test (after deploy)

Liveness (no auth):

```bash
curl -s https://mcp.coinrithm.com/healthz
# {"ok":true,"service":"coinrithm-mcp","transport":"streamable-http"}
```

Missing-auth guard (expect HTTP 401):

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://mcp.coinrithm.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}},"id":1}'
# 401
```

Per-request key forwarded upstream — use a **real** `crk_live_…` key and call
`whoami`. It is a single stateless POST (no session handshake needed):

```bash
KEY=crk_live_your_real_key
curl -s -X POST https://mcp.coinrithm.com/mcp \
  -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}},"id":1}'

curl -s -X POST https://mcp.coinrithm.com/mcp \
  -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"whoami","arguments":{}},"id":2}'
# -> body shows your userId/keyId/scopes (httpStatus 200). A bad key -> httpStatus 401.
```

If `whoami` returns your identity, the per-request key is flowing through to
`/api/agent/me` correctly. Two different users with two different keys hitting
the same endpoint each see only their own account.

## Notes / caveats

- **Stateless by design.** `sessionIdGenerator: undefined` → a fresh MCP server +
  transport per request, so no state is shared between users. This is the right
  isolation model for a per-request-keyed multi-tenant surface.
- **HTTPS only in front.** Keys travel in the `Authorization` header; terminate
  TLS at the proxy and never expose the container on plain HTTP publicly.
- **No key at rest.** The server never stores keys; each is used only for the one
  request that carried it.
- Trust boundary: a user pasting their key into this hosted endpoint is trusting
  CoinRithm to forward it only to `/api/agent/*`. The hosted server does exactly
  that and nothing else.

---

## Publishing the npm package (`@coinrithm/mcp-trading`)

The stdio path (`npx -y @coinrithm/mcp-trading`) is served from npm — published
from this package (public scope) so local users don't have to clone. This is a
**separate** release from the hosted deploy above.

```bash
cd packages/mcp-trading
# 1. bump "version" in package.json — npm rejects re-publishing the same version
npm run build
npm pack --dry-run     # verify the tarball: dist/*.js + README.md + package.json only
npm publish --access public
```

`prepare` rebuilds on publish and `publishConfig.access` is `public`, so once you
are `npm login`'d with publish rights on the `@coinrithm` org, `npm publish` is
enough (enter the one-time OTP if prompted). The npmjs.com **website** can lag the
registry by a few minutes after publishing — `npm view @coinrithm/mcp-trading
version` is authoritative.

**A code change usually needs BOTH releases:** republish npm (above) for local
users, AND let the hosted container redeploy (a kit `main` push auto-deploys it
via Coolify) for `mcp.coinrithm.com` users.
