# Deploy: hosted MCP at `mcp.coinrithm.com`

Runbook for the **multi-user, hosted** CoinRithm trading MCP server. Users point
their MCP client at `https://mcp.coinrithm.com/mcp`. Initialization, tool
listing and the tools described as keyless public data reads need no API key.
Account and paper-trading tools use **the caller's own** `crk_live_…` key in
the `Authorization` header. There is no shared default API key.

> Single-user local use does **not** need this. For Claude Desktop / Cursor /
> Codex on one machine, use the stdio path (`npx -y @coinrithm/mcp-trading`),
> which keeps using the `COINRITHM_API_KEY` env var. This runbook is only for the
> shared hosted endpoint.

---

## What ships

- **Entry:** `dist/http.js` (Streamable HTTP). **Not** `dist/index.js` (stdio).
- **Endpoint:** `POST /mcp` (+ unauthenticated `GET /healthz` liveness).
- **Auth model:** optional at the HTTP transport, required by private tools.
  Anonymous `initialize` and `tools/list` succeed; public `pm_data_*` reads use
  keyless upstream methods. A private tool called without a key returns an MCP
  tool error with `structuredContent.httpStatus: 401` and
  `body.error: "missing_api_key"` before contacting the upstream API. This is
  not a blanket HTTP 401 on initialization.
- **Caller isolation:** `Authorization: Bearer crk_live_…` is read per request
  and forwarded only by private `/api/agent/*` methods. Smithery can use
  `X-CoinRithm-API-Key: Bearer crk_live_…` instead. Public methods do not attach
  the caller's key, even when one was supplied.

## Environment

| Var                 | Value                                           | Required                                          | Notes                                                                                                                                        |
| ------------------- | ----------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`              | `8787`                                          | no (default `8787`)                               | Port the HTTP server listens on; Coolify routes the domain here.                                                                             |
| `COINRITHM_API_URL` | `http://api:4000` on our shared Coolify network | no (external default `https://api.coinrithm.com`) | Our hosted service calls the API internally, without exiting through Cloudflare. External/self-hosted clients keep the public HTTPS default. |
| `COINRITHM_API_KEY` | —                                               | **no**                                            | **Do NOT set.** Ignored by the HTTP entry; keys arrive per request.                                                                          |

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
2. **Env:** set `PORT=8787` and, on our shared Coolify Docker network,
   `COINRITHM_API_URL=http://api:4000`. Verify that `api` resolves from this
   container. External installations without that private network use
   `https://api.coinrithm.com`; do not change the package's public default.
   Leave `COINRITHM_API_KEY` **unset**.
3. **Port mapping:** expose container port **8787**.
4. **Domain:** add `mcp.coinrithm.com` and route it to the container. MCP clients
   connect to the `/mcp` path, so the public URL is
   `https://mcp.coinrithm.com/mcp`. (No special path rewrite needed — the app
   serves `/mcp` and `/healthz` directly.)
5. **TLS:** let Coolify/Traefik terminate HTTPS for `mcp.coinrithm.com`.
6. **Health check:** `GET /healthz` returns `{"ok":true,...}` — use it as the
   container/uptime probe (it needs no auth).
7. **Serialize the release.** Coolify apps **4 (MCP)** and **9 (scheduler)**
   both track this repository's `main`, with auto-deploy enabled and no watch
   paths (verified 2026-09-12). A normal main push can queue both builds at
   once. Do not push or deploy while another app is building; follow the
   exact-SHA procedure below instead of assuming a kit push is safe.

## Smoke test (after deploy)

Liveness (no auth):

```bash
curl -s https://mcp.coinrithm.com/healthz
# {"ok":true,"service":"coinrithm-mcp","transport":"streamable-http"}
```

Anonymous initialization (expect HTTP 200 with an MCP initialize result;
the body may use Server-Sent Events):

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://mcp.coinrithm.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}},"id":1}'
# 200
```

Anonymous tool-list introspection, with no upstream data request:

```bash
curl -s -X POST https://mcp.coinrithm.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}'
# tools include pm_data_overview, pm_data_event, get_candles and private tools
```

Missing-key enforcement belongs to the **private tool**, not initialization:

```bash
curl -s -X POST https://mcp.coinrithm.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"whoami","arguments":{}},"id":3}'
# MCP result: isError=true, structuredContent.httpStatus=401,
# structuredContent.body.error="missing_api_key". No upstream request.
```

An optional public-data smoke can call `pm_data_event` for one known source
and slug with `detail: "compact"`, without an Authorization header. A genuine
per-request-auth smoke may call `whoami` with a separately authorized read-only
key, but must not place orders. Do not print that key, put it in a URL, or
substitute a dummy key into an upstream account call.

For a local stdio packaging smoke, the entry still requires a configured
`COINRITHM_API_KEY`. An obviously dummy `crk_live_`-prefixed value is sufficient
for **initialize and tools/list only**. Point `COINRITHM_API_URL` at a local
request-counting stub and assert zero upstream requests; this tests the package
without accessing a real account. It does not prove key validity or trading.

## HTTP completion diagnostics

The HTTP-only completion observer was verified on the hosted MCP on
**2026-09-13**, at source/image commit
`18a0bb6a8a0665e91cebc10225fec6f7ebcdaaf7`. The bounded anonymous smoke passed
health, initialization, listing, missing-key `whoami` 401, public search/detail
200 and missing-detail 404. Reverify the exact image and a bounded smoke before
a new measurement window. Stdio, tools and authentication are unchanged.
**npm 0.7.9 was separately published and verified on 2026-09-15**, including
downloaded archive integrity and a clean registry-install smoke.

Each accepted MCP RPC produces one bounded scalar JSON record on HTTP finish or
abort; batches share the HTTP request's duration and delivery outcome. The observer
reads the SDK's final result after output validation, not a premature tool-callback
success. A failed send or aborted response is not recorded as successful delivery.
Parser/transport rejections before SDK dispatch instead produce one
`operation=invalid`, `rpc_outcome=no_response` record with the actual HTTP status.
Health, landing and other GET probes are excluded.

Records use the existing stderr prefix `[coinrithm-mcp]` followed by one JSON line
with `event=mcp_completion`, `schema_version=1`, server version, transport,
completion timestamp, `duration_ms`, operation, allowlisted tool name (otherwise
`unknown`), `credential_supplied`, RPC outcome, structured result status/ok,
HTTP status and `delivery=finished|aborted`. `result_http_status` comes from
`structuredContent.httpStatus`: a local missing-key result can be 401 and a client
network failure 0; it is not always an observed upstream HTTP response. Missing
result values remain null. `duration_ms` is monotonic **HTTP request-to-completion
latency**, shared by batch members, not independent tool execution time.

No arguments, bodies, prompts, raw errors, RPC IDs, keys/hashes, IPs, URLs,
clientInfo, User-Agent or trace fields enter these records. RPC correlation IDs
exist only transiently in the request scope and are cleared on completion.
`auth_verdict` and `access_path` are deliberately omitted: credential presence
does not prove authentication or caller origin, including for public Arena calls.
No external-builder, hosted-agent, unique-user, retention or payment claim can be
derived from these records. Server finish is not client receipt, citation or use.

For a successful tool-completion count require `operation=tools_call`,
`delivery=finished`, `rpc_outcome=result`, `result_ok=true`, and 2xx result and
transport statuses. Keep initialization, listing, notifications, protocol/tool
failures and aborted delivery separate. Query only a bounded Docker/Coolify log
window for the verified MCP container, parsing the fixed prefix/event; do not
treat pre-existing diagnostic lines as completion records. Logger exceptions are
isolated from responses; metrics never use stdout, which remains the stdio
protocol channel. Missing logs are not proof of zero traffic.

The operator verified the then-hosted container's Docker `json-file` rotation on
2026-09-12 UTC as `max-size=10m`, `max-file=3` (roughly 30 MB bounded retention).
This is **hosted configuration, not a package guarantee or durable trend store**.
Recheck it after deployment; rotation and container replacement can remove the
window. Retained coverage must be established before reporting longer-term trends.

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

## Release sequencing: source, hosted, npm and registry

The stdio path (`npx -y @coinrithm/mcp-trading`) is served from npm. A source
version bump, a hosted deployment, an npm publication and an MCP Registry entry
are four different states. Do not claim one merely because another succeeded.

**Published release (verified 2026-09-15):** the operator published MCP **0.7.9**,
TypeScript SDK **0.3.1** and Python SDK **1.8.1**. All four registry downloads
match the prepared artifacts, and fresh npm/PyPI installations passed offline
smokes. Source `d052a7bb7ce791623f4e80e72748b75d50ea6b83` passed all five CI jobs;
hosted MCP deployment **2496** and scheduler deployment **2497** separately
finished on that exact source. Both prior images remain available for rollback.
The official MCP Registry also lists **0.7.9**, verified after the matching
[release workflow](https://github.com/CoinRithm/coinrithm-agent-trading/actions/runs/34965036681)
published `server.json` from that same source. Registry metadata and npm delivery
were checked separately.

1. Update package.json, its lockfile's root versions, both server.json version
   fields, the changelog and the README's source/publication wording. Keep
   `mcpName` aligned with the registry name. A package-only correction does not
   require an API-contract version bump.
2. Run the package validation sequence and inspect the pack manifest:

```bash
cd packages/mcp-trading
npm run format:check
npm run lint
npm run typecheck
npm audit --audit-level=high
npm run test:coverage
npm run build
npm pack --dry-run --json
# Expect compiled dist/*.js + declarations (including dist/agent/*), both
# binaries, package.json, README.md and CHANGELOG.md; no .env/.npmrc/tests.
```

3. Coordinate with other operators before a main push. To prevent Coolify from
   starting both apps, **every new commit in the push** must contain
   `[skip cd]`. The installed handler skips only when all commit messages carry
   that marker; placing it solely on the last commit is insufficient. Do not
   use `[skip ci]`: GitHub CI must still run. Verify the pushed SHA, green CI
   and that no unwanted Coolify deployment was queued.
4. With separate deployment authorization and no other active build, queue the
   exact reviewed SHA for hosted MCP app4. Verify the resulting image commit,
   health, anonymous initialize version, tools/list and a bounded public-data
   read. Do not replace an in-progress backend build. If app9 also needs the
   reviewed source, deploy that exact SHA only after app4 finishes and is
   healthy. A compactor/documentation-only change does not itself require a
   scheduler restart. Never cancel another operator's build to make room.
5. Only with working npm publishing authorization, publish the reviewed 0.7.9
   package as public. `prepare` rebuilds during packaging/publishing. Inspect
   `npm view @coinrithm/mcp-trading@0.7.9 version gitHead dist.integrity` and
   smoke the published stdio binary before marking npm delivered. Preserve the
   prior immutable release; do not try to overwrite its version.
6. Once npm and hosted evidence are confirmed, publish the matching registry
   metadata. `.github/workflows/publish-mcp.yml` uses GitHub OIDC and runs on
   `v*` tags or explicit dispatch. It publishes **server.json only**, not the
   npm package, and it does not wait for CI. Tag/dispatch the exact release ref
   only after npm exists; never rely on a tag to perform the npm upload.
7. Remove the pending-publication note only after npm verification. Record
   source SHA, hosted image SHA, npm version/integrity and registry version
   separately. On failure, roll hosted app4 back to its recorded prior image;
   a published package correction needs a new version, not a replacement
   upload. Do not conceal an unpublished npm release behind a hosted success.
