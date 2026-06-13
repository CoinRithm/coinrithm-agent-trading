# Staying in sync — the canonical polling recipe

Stops, take-profits, liquidations, PM settlements, and resting spot fills all
happen **server-side** while your agent isn't looking: a per-minute worker
fires futures SL/TP and liquidations off the live mark, PM settlement runs
every few minutes, and limit/stop spot orders fill against live prices. An
agent that only reacts to its own tool calls will silently miss all of them.

This page is the one pattern every long-running CoinRithm agent should
implement. Both bot templates
([`momentum-bot.mjs`](../examples/bots/momentum-bot.mjs),
[`pm-edge-bot.mjs`](../examples/bots/pm-edge-bot.mjs)) and the
[eval report](../examples/eval-report.mjs) use exactly this loop.

## The contract

Four read endpoints support delta polling:

| Endpoint | What changed shows up as |
| --- | --- |
| `GET /api/agent/trades` | newly **closed/settled** trades (any venue) — incl. `stop_loss` / `take_profit` / `liquidation` exits and PM settlements |
| `GET /api/agent/orders/open` | open spot orders whose row changed (placed, filled, cancelled) |
| `GET /api/agent/positions/futures` | futures positions whose row changed (open / close / liquidation / SL-TP edit) |
| `GET /api/agent/positions/pm` | PM positions whose row changed (open / settlement / void) |

All four take an optional `updatedSince` (ISO 8601) query parameter and return
an `asOf` timestamp in the response. The rules:

1. **First call: no `updatedSince`.** Take the full snapshot, remember `asOf`.
2. **Every later call: pass the previous response's `asOf` as `updatedSince`.**
   You get only what changed in between. `asOf` is server-clock based, so it is
   skew-safe — never substitute your own clock.
3. **Persist the cursor** (a small state file / DB row). Your agent can crash,
   sleep, or be re-run, and the watch resumes exactly where it left off.
4. **Treat delivery as at-least-once — dedupe by `(venue, id)`.** The window
   filter is inclusive, so a row that lands exactly on the cursor boundary can
   appear in two consecutive windows. Keep a short list of `(venue, id)` pairs
   you have already processed and skip repeats. Never assume exactly-once.
5. **Pace with the `RateLimit-*` headers.** Every response carries
   `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` for the
   per-key budget (120 req/min baseline). If `Remaining` runs low, wait for
   `Reset` before the next poll instead of guessing.
6. **On `429`, honor `Retry-After`.** Wait at least that many seconds, then
   resume. Don't hammer.

A 60-second poll interval is the sweet spot for futures (the SL/TP worker runs
per-minute); PM settlement is fine at 5 minutes. One poll per minute is 1 of
your 120 req/min — polling is cheap.

## Copy-paste loop (Node 18+, zero deps)

```js
import { readFileSync, writeFileSync } from "node:fs";

const BASE = "https://api.coinrithm.com";
const KEY = process.env.COINRITHM_API_KEY;
const RUN_ID = process.env.COINRITHM_RUN_ID || "sync-loop";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const load = () => { try { return JSON.parse(readFileSync(".state.json", "utf8")); } catch { return { cursor: null, seen: [] }; } };

const state = load();
for (;;) {
  const qs = state.cursor ? `?updatedSince=${encodeURIComponent(state.cursor)}` : "?limit=1";
  const res = await fetch(`${BASE}/api/agent/trades${qs}`, {
    headers: {
      Authorization: `Bearer ${KEY}`,
      "X-CoinRithm-Run-Id": RUN_ID,
      "X-CoinRithm-Strategy-Label": "sync-loop",
    },
  });
  if (res.status === 429) {                       // backoff: honor Retry-After
    await sleep((Number(res.headers.get("retry-after")) || 30) * 1000);
    continue;
  }
  const j = await res.json();
  state.cursor = j.asOf;                          // ALWAYS advance from the response
  for (const t of j.trades ?? []) {
    const dedupeKey = `${t.venue}:${t.id}`;       // at-least-once -> dedupe
    if (state.seen.includes(dedupeKey)) continue;
    state.seen = [...state.seen, dedupeKey].slice(-200);
    console.log(`closed: ${t.venue} #${t.id} ${t.side} pnl=${t.realizedPnlMusd} mUSD`);
    // -> react here: notify, rebalance, re-enter, log to your journal …
  }
  writeFileSync(".state.json", JSON.stringify(state));
  const remaining = Number(res.headers.get("ratelimit-remaining"));
  if (Number.isFinite(remaining) && remaining < 8) // pace off the live headers
    await sleep((Number(res.headers.get("ratelimit-reset")) || 10) * 1000);
  await sleep(60_000);                             // SL/TP worker is per-minute
}
```

The same loop works verbatim against `/orders/open`, `/positions/futures`, and
`/positions/pm` — only the response array field changes (`rows` / `positions`).

## Observation provenance

Every delta read and quote response attaches a compact `observation` block in
the response body:

```json
{
  "observation": {
    "schema": "market_snapshot_v1",
    "endpoint": "/api/agent/market/:coinId",
    "source": "coinrithm",
    "observedAt": "2026-06-13T10:00:00.000Z",
    "sourceAsOf": "2026-06-13T09:59:45.000Z",
    "freshness": { "status": "fresh", "ageSeconds": 15 },
    "inputs": { "coinId": "1" },
    "dataset": "price_snapshot",
    "rowCount": 1,
    "hash": "sha256:abc123…"
  }
}
```

Rules:

1. **Check `freshness.status` before acting.** `fresh` = safe to trade on.
   `stale` or `never_ingested` = skip and do not open a position.
2. **`observedAt` is the API server clock when the response was built;
   `sourceAsOf` is the upstream data timestamp.** The agent's ledger stores
   both, giving the run export proof that the agent acted only on data that
   existed at decision time.
3. **`hash` is a short payload fingerprint.** Two runs that agree on `hash` for
   the same `endpoint`/`inputs` saw the same underlying data.

For prediction-market discovery, the response also carries
`meta.sourceHealth` — one entry per ingest source:

```json
{
  "meta": {
    "sourceHealth": [
      { "slug": "kalshi",     "lastIngestAt": "…", "ingestAgeSeconds": 45,   "status": "fresh" },
      { "slug": "polymarket", "lastIngestAt": "…", "ingestAgeSeconds": 3800, "status": "stale" }
    ]
  }
}
```

Skip sources with `status: stale` or `status: never_ingested` before quoting.

**Conflicting trace metadata is rejected.** A request that sends BOTH a body
`agentTrace` object AND any `X-CoinRithm-Run-Id` / `X-CoinRithm-Decision-Id` /
`X-CoinRithm-Strategy-Label` / `X-CoinRithm-Confidence` header will be
rejected with `400`. Use one or the other — `agentTrace` for MCP tool calls;
headers for raw HTTP reads.

---

## Ledger trace for reproducible runs

All `/api/agent/*` reads in this loop are recorded in the private action ledger
for the calling key. The response headers include `X-CoinRithm-Ledger-Event-Id`
and `X-CoinRithm-Ledger-Status` when persistence succeeds.

For raw HTTP reads, use headers to group the polling evidence:

```
X-CoinRithm-Run-Id: sync-loop-2026-06-12
X-CoinRithm-Decision-Id: poll-0007
X-CoinRithm-Strategy-Label: sync-loop
X-CoinRithm-Confidence: 0.5
```

For MCP calls, pass the equivalent `agentTrace` object. Use one `runId` for the
whole bot session and a distinct `decisionId` for each material decision or
quote/write pair. Export the run with:

```
GET /api/agent/ledger/export?runId=sync-loop-2026-06-12
```

The ledger stores sanitized summaries and optional short rationale summaries
only. Do not send chain-of-thought, API keys, emails, or private account
identity in `agentTrace`.

## What you'll catch

- a **stop-loss / take-profit fire** — shows up in `/trades` with
  `venue: "futures"`; the position row carries `exitReason: "stop_loss" |
  "take_profit"` and the realized PnL
- a **liquidation** — same path, `exitReason: "liquidation"`
- a **PM settlement or void** — `venue: "pm"`; the position row carries
  `payoutMusd`, `pnlMusd`, and `voidReason` when refunded
- a **resting spot fill** — the order leaves `/orders/open` and the fill
  appears in `/trades` with `venue: "spot"`

## Semantics worth knowing

- **Futures triggers are mark-sampled, not tick-perfect.** SL/TP and
  liquidation evaluate the latest mark roughly every 60 seconds. A level that
  is crossed only transiently between samples may not fire. Plan stops with
  that granularity in mind.
- **Quiet ≠ broken.** An empty delta is the normal case. To distinguish "no
  fills" from "my key is dead", check that the response is a 200 with a fresh
  `asOf` — auth failures are explicit `401`s.
- **MCP agents:** the same cursor is exposed on the `get_my_trades`,
  `list_open_orders`, and `get_positions` tools (`updatedSince` in, `asOf`
  out) — the loop above translates 1:1 to tool calls.
