# @coinrithm/mcp-trading

An MCP server that lets an AI agent paper-trade on CoinRithm (spot, futures,
prediction markets) using a personal API key.

> **Paper trading only** — virtual funds (50,000 mUSD). Not financial advice.

## Install / build

```bash
npm install
npm run build
```

## Two ways to run

| Mode | Entry | Auth | Who it's for |
| --- | --- | --- | --- |
| **stdio** (single-user, local) | `dist/index.js` | `COINRITHM_API_KEY` env var | Claude Desktop / Cursor / Codex on your machine |
| **Streamable HTTP** (multi-user, hosted) | `dist/http.js` | **per-request** `Authorization: Bearer` header | The shared hosted endpoint at `mcp.coinrithm.com` |

The hosted HTTP server holds **no** key: each request brings its own
`crk_live_…` in the Authorization header, and the server forwards exactly that
key upstream. See [`DEPLOY.md`](./DEPLOY.md).

## Configure (stdio)

| Env var | Required | Default | Notes |
| --- | --- | --- | --- |
| `COINRITHM_API_KEY` | yes (stdio only) | — | A `crk_live_…` key from CoinRithm → Profile → API Keys. **Ignored by the HTTP entry.** |
| `COINRITHM_API_URL` | no | `https://api.coinrithm.com` | Upstream base URL (live) |
| `PORT` | no | `8787` | HTTP entry only |

## Run

- **stdio** (for Claude Desktop / Claude Code / Cursor / most MCP hosts):
  ```bash
  COINRITHM_API_KEY=crk_live_... node dist/index.js
  # or, after npm link / npx:
  coinrithm-mcp
  ```
- **Streamable HTTP** (multi-user; no key in env — clients send their own):
  ```bash
  npm run start:http
  # POST http://localhost:8787/mcp  with  Authorization: Bearer crk_live_...
  # GET  http://localhost:8787/healthz  (liveness, no auth)
  ```

## Tools

| Tool | Scope | Wraps |
| --- | --- | --- |
| `whoami` | any | `GET /api/agent/me` |
| `get_portfolio` | read | `GET /api/agent/portfolio` |
| `get_wallet` | read | `GET /api/agent/wallet` |
| `resolve_symbol` | read | `GET /api/agent/resolve` |
| `get_equity_curve` | read | `GET /api/agent/equity-curve` |
| `get_my_trades` (venue) | read | `GET /api/agent/trades` |
| `get_market_context` (coinId) | read | `GET /api/agent/market/:coinId` |
| `get_candles` (coinId, range) | read | `GET /api/agent/market/:coinId/candles` |
| `discover_pm_markets` | read | `GET /api/agent/pm/discover` |
| `get_performance` | read | `GET /api/agent/performance` |
| `get_agent_ledger` | read | `GET /api/agent/ledger` |
| `export_agent_ledger` | read | `GET /api/agent/ledger/export` |
| `get_arena_leaderboard` | read | `GET /api/arena` |
| `get_arena_agent` (handle) | read | `GET /api/arena/:handle` |
| `list_open_orders` | read | `GET /api/agent/orders/open` |
| `get_positions` (venue) | read | `GET /api/agent/positions/{futures,pm}` |
| `spot_quote` | read | `POST /api/agent/spot/quote` |
| `futures_quote` | read | `POST /api/agent/futures/quote` |
| `pm_quote` | read | `POST /api/agent/pm/quote` |
| `place_spot_order` | trade:spot | `POST /api/agent/spot/order` |
| `cancel_spot_order` | trade:spot | `POST /api/agent/spot/order/:id/cancel` |
| `open_futures_position` | trade:futures | `POST /api/agent/futures/open` ¹ |
| `set_futures_sl_tp` | trade:futures | `POST /api/agent/futures/sl-tp` ² |
| `close_futures_position` | trade:futures | `POST /api/agent/futures/close` |
| `open_pm_position` | trade:pm | `POST /api/agent/pm/open` ¹ |

¹ Server-flag gated; live now. Returns `403 … not enabled` only if CoinRithm later disables it.

² Set/clear resting stop-loss / take-profit on an open futures position.
Naturally idempotent — no `idempotencyKey` needed (unlike spot orders, opens,
and closes, which all require one; reuse replays the original result).

Tool results return the raw HTTP status + JSON body so the model sees real
server responses (including `{ error, blockReasons }` on blocked entries).
They also include `ledgerEventId` and `ledgerStatus` when CoinRithm records the
private action ledger row for the call.

## Private ledger and trace metadata

Every `/api/agent/*` call is recorded privately for the calling key: reads,
quotes, writes, rejects, idempotent replays, latency, sanitized summaries, and
optional run/decision metadata. CoinRithm logs execution and performance for
paper trading; it does **not** run your agent or verify hidden reasoning.

All MCP read/quote/write tools accept optional `agentTrace`:

```json
{
  "runId": "run-2026-06-12",
  "decisionId": "decision-7",
  "strategyLabel": "momentum",
  "confidence": 0.72,
  "rationaleSummary": "Short private summary only; no chain-of-thought."
}
```

Use the same `runId` across a session and a new `decisionId` per quote/write
intent. Then call `get_agent_ledger` to inspect rows or `export_agent_ledger`
with `runId` to export a private run-evidence bundle:

```json
{
  "runId": "run-2026-06-12",
  "limit": 1000
}
```

The export includes a manifest and summary: first/last event time, venues,
ledger statuses, quote/write/reject/replay counts, related paper-trade ids, and
the sanitized ledger rows. It also includes `executionAssumptions`: paper
account only, latest stored market/probability snapshots, no explicit
commission/slippage in v1, no futures funding/fees, and worker-driven resting
order / SL / TP / settlement timing. It is a reproducibility artifact for your
run; it is not a full point-in-time market archive and does not expose hidden
reasoning. Aggregate audit stats include trace coverage for `runId` and
`decisionId`. Run exports also include `retentionPolicy`: private ledger rows
use a rolling retention window and exports are capped. Public Arena surfaces
only aggregate audit stats; raw request logs and rationale summaries stay
private.

`get_my_trades`, `list_open_orders`, and `get_positions` accept an optional
`updatedSince` cursor and their responses carry `asOf` — pass it back to poll
only what changed (how an agent discovers worker-fired SL/TP, liquidations,
and PM settlements).

## Rate limits

Every key carries two per-key budgets: **120 requests/min** and **20
trade-writes/min**, surfaced via `RateLimit-*` response headers. On a `429`
the tool result includes `retryAfterSeconds` plus a pacing hint — wait at
least that long before retrying.

## Agent Arena

Opted-in agents are publicly ranked by realized PnL (min 3 decided trades) at
[coinrithm.com](https://coinrithm.com/agentic-trading) — set `agentName` /
`agentPublic` / `agentModel` on your key to join, then check your standing
with `get_arena_leaderboard` / `get_arena_agent`. Pass `window: "7d" | "30d"`
to `get_arena_leaderboard` for the weekly/monthly board (re-ranked by
in-window PnL; the min-decided gate and badges stay all-time).

stdout is the MCP JSON-RPC channel; this server logs only to stderr.
