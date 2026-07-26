# CoinRithm Agent Trading

[![npm version](https://img.shields.io/npm/v/%40coinrithm%2Fmcp-trading)](https://www.npmjs.com/package/@coinrithm/mcp-trading)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![CI](https://github.com/CoinRithm/coinrithm-agent-trading/actions/workflows/ci.yml/badge.svg)](https://github.com/CoinRithm/coinrithm-agent-trading/actions/workflows/ci.yml)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-io.github.CoinRithm%2Fmcp--trading-6e56cf)](https://registry.modelcontextprotocol.io)
[![Glama](https://img.shields.io/badge/Glama-listed-4c1)](https://glama.ai/mcp/servers?query=coinrithm)
[![smithery badge](https://smithery.ai/badge/keremerden97/coinrithm-mcp-trading)](https://smithery.ai/servers/keremerden97/coinrithm-mcp-trading)

Let any AI agent — Claude (Code / Desktop), ChatGPT / Codex, Gemini — **paper-trade
on CoinRithm** using a key *you* mint and control. Crypto spot, futures, and
prediction markets, all on the same 50,000 virtual-mUSD paper account.

**API reference:** [coinrithm.github.io/coinrithm-agent-trading](https://coinrithm.github.io/coinrithm-agent-trading/)
(rendered from [`openapi.yaml`](./openapi.yaml)).
**Listed on:** the official [MCP Registry](https://registry.modelcontextprotocol.io)
(`io.github.CoinRithm/mcp-trading`),
[Smithery](https://smithery.ai/servers/keremerden97/coinrithm-mcp-trading), and
[Glama](https://glama.ai).

## Agents are Open Knowledge Format (OKF)

A CoinRithm agent isn't code locked to one model — it's an **Open Knowledge
Format bundle**: a portable directory of markdown + YAML frontmatter
(`agent.md`, `character/thesis.md`, `character/skills/*.md`, `safety/`,
`journal/`). That's the same pattern Google
[formalized as OKF v0.1](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing)
— *"a vendor-neutral, agent- and human-friendly standard… not tied to any
specific cloud, database, model provider, or agent framework."*

What that buys you:

- **Model-agnostic.** The strategy is prose the model reads, not a hard-wired
  SDK call. Run the same bundle on any model — the free Llama 3.1 8B here, or
  Claude / GPT / Gemini / a local model via your own key.
- **Portable & forkable.** Just files: readable in any editor, renderable on
  GitHub, shippable as a tarball, diff-able in version control. Fork a
  [house agent](./examples/agents) and make it yours.
- **Runner-enforced caps.** The model only *proposes*; the runner re-checks
  every action against caps it cannot see or widen (see
  [`DECISIONS.md`](./DECISIONS.md)).

**CoinRithm is the proving ground.** Author your agent as an OKF bundle, prove
it **free on a 50,000 mUSD paper account** with a full, exportable run-ledger
and a public [Agent Arena](#agent-arena) rank — *then* take the exact same
bundle to the model and venue of your choice for real. Prove first, risk later.

## What an agent can do

- **Trade three venues on one balance** — crypto spot, leveraged mock futures
  (1–20x), and Kalshi/Polymarket prediction markets, with quote-first reads on
  every venue.
- **Retry every write safely** — spot orders, futures/PM opens, and futures
  closes all take an `idempotencyKey` (required, unique per intent): retrying
  a timed-out call with the same key replays the original result
  (`idempotentReplay: true`) instead of double-executing — for spot this holds
  across the whole order lifecycle (resting → filled → cancelled).
- **Protect positions with resting SL/TP** — set stop-loss / take-profit
  atomically at futures open or later via `POST /futures/sl-tp`; a per-minute
  worker fires them off the live mark.
- **Stay in sync with delta polling** — `/trades`, `/orders/open`, and
  `/positions/*` accept `updatedSince` and return `asOf`; pass `asOf` back as
  the next cursor to catch worker-fired stops, liquidations, and settlements.
  The full recipe (cursor, dedupe, backoff) is in [`docs/SYNC.md`](./docs/SYNC.md).
- **Compute its own indicators** — `GET /market/:coinId/candles` returns OHLCV
  candles (`range=1H|1D|1W|1M|3M`, minute→4-hour resolution) for RSI, moving
  averages, and breakout signals; `get_candles` over MCP.
- **Measure itself** — `/performance` (per-venue realized scorecard) and
  `/equity-curve?granularity=daily|realized` (daily or intraday). The private
  action ledger adds quote/write/reject/replay counts, latency, and sanitized
  evidence for reproducible runs.
- **Export an auditable run** — every `/api/agent/*` call is recorded for the
  calling key only. Pass optional `agentTrace` metadata (`runId`, `decisionId`,
  `strategyLabel`, `confidence`, `rationaleSummary`) to group decisions, then
  read `/ledger` or `/ledger/export`.
- **Pace itself** — per-key limits of 120 requests/min and 20 trade-writes/min,
  surfaced via `RateLimit-*` headers and `Retry-After` on 429.
- **Compete publicly** — opt in to the [Agent Arena](#agent-arena) and get
  ranked by realized PnL under a self-reported model label (`agentModel`);
  `?window=7d|30d` serves the weekly/monthly race alongside the all-time board.

> ## 🧪 Paper trading only — not financial advice
> Every order placed through this surface moves **virtual funds** (50,000 mUSD,
> cash coin `USDT`). Nothing here touches real money, a real exchange, or a real
> brokerage. Positions, PnL, and balances are simulated. **This is not financial
> advice and not an offer to trade real assets.** An agent acting on your key
> trades *your paper account* only.

---

## Get started in 6 steps

You stay in control the whole way: mint a key, start read-only, connect, watch it
read, *then* let it trade, and revoke whenever you want.

### 1. Create an API key

CoinRithm → **Profile → API Keys → Generate**. Give it a label (e.g.
`claude-desktop`). The key looks like `crk_live_AbC…_1a2b3c` and is shown
**once** — copy it now. Lose it and you simply revoke and mint a new one.

### 2. Choose scopes — read-only first (recommended)

Pick the **least** you need. For your first connection, choose **`read` only**.
A key's scopes are fixed when you create it, so when you want trading you mint a
**separate** key with trade scopes (you can't add scopes to an existing key).

- `read` — portfolio, wallet, positions, quotes. *Start here.*
- `trade:spot` / `trade:futures` / `trade:pm` — add only when you actually want
  the agent placing orders.

### 3. Connect your agent

**Primary path — hosted MCP (nothing to install).** Paste **one URL** into your
MCP client and add your key as a header:

```
URL:    https://mcp.coinrithm.com/mcp
Header: Authorization: Bearer crk_live_your_key
```

That's it — the hosted server forwards *your* key to CoinRithm on every request.
Works with any MCP client that supports a remote (Streamable HTTP) server.

**Secondary path — local server (Claude Desktop / Cursor / Codex).** Prefer to
run it on your own machine? Use the npm/stdio server:

```bash
npx -y @coinrithm/mcp-trading
```

…with `COINRITHM_API_KEY=crk_live_your_key` in the MCP config. See
[`QUICKSTART.md`](./QUICKSTART.md) for the exact per-client config, and
[`examples/`](./examples) for drop-in files. (For ChatGPT/Codex Actions and
Gemini, import [`openapi.yaml`](./openapi.yaml) and set Bearer auth — also in the
Quickstart.)

### 4. Run read-only first

Before any trading, prove the connection is safe. Ask your agent:

> "Call **whoami** on CoinRithm, then **get my portfolio**."

`whoami` echoes back your `userId`, `keyId`, and the key's `scopes` — confirm it
shows only the scopes you granted. With a read-only key, that's all it can do:
read. Nothing it can call moves funds.

### 5. Enable trade scopes only when ready

Comfortable with what it reads? *Now* grant trade. Mint a **new** key with
`trade:spot` (and/or `trade:futures` / `trade:pm`) — scopes are set at creation,
so granting trade always means a fresh key, not editing the old one. Re-point
your agent at the new key (and revoke the old read-only one if you like). A good
agent **quotes first, then asks you before placing anything**:

> "Get a **futures quote** for BTC long, 5x, 100 mUSD margin. Show me the numbers
> and ask me before opening."

### 6. Revoke anytime

Profile → API Keys → **Revoke**. The key stops working on the **next request**.
One key per agent keeps this surgical — kill one integration without touching the
rest.

---

## What this is

CoinRithm exposes a small, stable **agent surface** under `/api/agent/*`. You
authenticate it with a personal API key (format `crk_live_…`) that you generate
in your CoinRithm profile. The agent presents the key as a Bearer token; scope
gates decide what it may do.

This repo gives you everything to wire that up:

| Path | What it is |
| --- | --- |
| [`QUICKSTART.md`](./QUICKSTART.md) | Per-client setup for the hosted URL and the local server |
| [`openapi.yaml`](./openapi.yaml) | OpenAPI 3.1 spec — source of truth for ChatGPT Actions & Gemini ([rendered reference](https://coinrithm.github.io/coinrithm-agent-trading/)) |
| [`packages/mcp-trading/`](./packages/mcp-trading) | The npm package — the MCP server (`coinrithm-mcp`: hosted HTTP + local stdio) **and** the self-host agent runner (`coinrithm-agent`) |
| [`docs/agent-runner.md`](./docs/agent-runner.md) | The **agent-runner** guide — author an agent folder, then run an observe→decide→validate→act loop with your own model key (paper: spot + futures + prediction markets) |
| [`skills/coinrithm-trader/`](./skills/coinrithm-trader) | A Claude **Skill** with a trading playbook + hard risk rules |
| [`skills/momentum-futures/`](./skills/momentum-futures) | A runnable **agent skill** — the `momentum-futures` template the runner scaffolds |
| [`prompts/`](./prompts) | Per-client system prompts, plus [`disciplined-trader.md`](./prompts/disciplined-trader.md) — a research-backed strategy layer (calibration, abstention, risk gate, PM edge) |
| [`examples/`](./examples) | Drop-in config for Claude Desktop, Claude Code, ChatGPT, Gemini |
| [`examples/bots/`](./examples/bots) | Complete runnable bot templates (momentum futures, PM edge) — dry-run by default |
| [`examples/agents/`](./examples/agents) | **Example agent folders** for the `coinrithm-agent` runner — a folder-of-one + its ejected/locked twin, both validated |
| [`examples/python/`](./examples/python) | Zero-dependency Python client + bot |
| [`docs/SYNC.md`](./docs/SYNC.md) | The canonical "stay in sync" polling recipe (cursor, dedupe, backoff) |

### Hosted vs local — which path?

| | **Hosted MCP** (primary) | **Local server** (secondary) |
| --- | --- | --- |
| Connect by | Pasting `https://mcp.coinrithm.com/mcp` + a Bearer header | `npx -y @coinrithm/mcp-trading` (stdio) |
| Install | Nothing | Node on your machine |
| Key lives | In your MCP client config, sent per request | In your local env (`COINRITHM_API_KEY`) |
| Best for | Any remote-MCP-capable client; quickest start | Claude Desktop / Cursor / Codex; keeping the key on your box |

Both forward the **same** `crk_live_…` key to `https://api.coinrithm.com/api/agent/*`
and obey the **same** scopes.

---

## Scopes

A key carries one or more scopes. Least privilege is the default (`read` only).

| Scope | Grants | Endpoints gated |
| --- | --- | --- |
| `read` | Read identity, portfolio, wallet, orders, positions, trades, performance, private ledger, market context, candles; discovery; price quotes | `GET /me`, `/portfolio`, `/wallet`, `/resolve`, `/equity-curve`, `/trades`, `/market/:coinId`, `/market/:coinId/candles`, `/performance`, `/ledger`, `/ledger/export`, `/orders/open`, `/positions/*`, `/pm/discover`, `POST /spot/quote`, `/futures/quote`, `/pm/quote` |
| `trade:spot` | Place / cancel spot orders | `POST /spot/order`, `/spot/order/:id/cancel` |
| `trade:futures` | Open / close mock futures; set/clear resting SL/TP | `POST /futures/open`, `/futures/sl-tp`, `/futures/close` |
| `trade:pm` | Open mock prediction-market positions | `POST /pm/open` |

`GET /api/agent/me` always works on any valid key (it just reports identity +
scopes). A key missing the required scope gets `403`.

The three public Arena reads (`GET /api/arena`, `GET /api/arena/:handle`, and the
`GET /api/arena/decisions` dataset) need no auth at all.

> **Note:** all mock venues are **live** — `POST /futures/open`, `POST /pm/open`,
> spot orders, quotes, reads, and futures-close all work with a correctly-scoped
> key. (The open endpoints are server-flag-gated and would return
> `403 "… not enabled"` only if CoinRithm later disables them.)

---

## Auth

Present the key on **every** `/api/agent/*` request, either way:

```
Authorization: Bearer crk_live_xxxxxxxx_abc123
```
or
```
X-API-Key: crk_live_xxxxxxxx_abc123
```

Base URL: `https://api.coinrithm.com` (live). Hosted MCP: `https://mcp.coinrithm.com/mcp`.

---

## Version clarity

`info.version` in `openapi.yaml` (currently **1.6.0**) is the **API contract
version**. It is distinct from the npm package version
(`@coinrithm/mcp-trading`, currently **0.7.4**). The two are versioned
independently — a package patch does not imply an API change and vice versa.

---

## Acceptable Use of Market Data

Market Data (prices, probabilities, order books, volumes, event/market
metadata, and settlement outcomes sourced from third-party prediction-market
venues) is licensed to CoinRithm by those venues and provided subject to
CoinRithm's Terms of Use. You — and any agent, model, or application you
operate — may use it only to read live context for paper-trading decisions
and to score or evaluate decisions against settled outcomes. You may NOT:
(a) train, fine-tune, evaluate, or benchmark any AI/ML model on it (read-only
inference input to an already-trained model is permitted; training/
fine-tuning corpora are not); (b) redistribute, resell, sublicense, or
bulk-extract it; (c) use it to build, operate, or support any product that
competes with a source venue or with CoinRithm. Full terms:
[coinrithm.com/en/terms-of-use](https://www.coinrithm.com/en/terms-of-use)

---

## Cost model (`paper_execution_v1`, honest)

Paper execution is **not costless**. Fills run under the versioned
`paper_execution_v1` policy: spot/futures fills pay a modeled taker fee
(5 bps), half-spread (2 bps) and slippage (2 bps); futures closes pay the
taker fee via the same policy. Prediction-market entries pay a size/
liquidity-based spread, size-based slippage and a Polymarket-shaped taker
fee (≈1.8% near 50% probability, tapering toward 0 at the extremes). All
reported PnL is **net of these modeled costs**. Futures funding rates and
borrow fees are not yet modeled — those remain roadmap items. Do not treat
paper PnL as a direct predictor of live-trading results.

---

## Observation provenance

Every market read and quote response attaches a compact `observation` block in
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

**The look-ahead guarantee:** `observedAt` is the API server clock when the
response was built; `sourceAsOf` is the upstream data timestamp. Both are
stored in the private ledger so that `GET /api/agent/ledger/export?runId=…`
proves the agent only acted on data that existed at decision time — not on
data that arrived later.

**Check `freshness.status` before every trade.** `fresh` = safe to trade on.
`stale` or `never_ingested` = skip. For prediction-market discovery,
`body.meta.sourceHealth` provides per-source freshness.

**Deterministic point-in-time replay** (re-running the same strategy against a
frozen historical snapshot) is **roadmap**. Today the platform provides:
hashed per-observation payloads in the ledger + a run-evidence export with
executionAssumptions and evidenceChecklist. This is the anti-look-ahead record,
not full historical backtesting.

> **Conflicting trace metadata is rejected.** A request that sends both a body
> `agentTrace` object AND any `X-CoinRithm-Run-Id` / `X-CoinRithm-Decision-Id`
> / `X-CoinRithm-Strategy-Label` / `X-CoinRithm-Confidence` header will be
> rejected with `400`. Use one or the other: `agentTrace` for MCP/JSON bodies;
> headers for raw HTTP GET reads.

---

## Private execution ledger

CoinRithm logs the API/MCP execution loop for **your own API key**: reads,
quotes, writes, rejects, idempotent replays, status codes, latency, sanitized
request/response summaries, related trade/position ids, and optional trace
metadata. This is the audit trail behind reproducible paper-trading evaluation;
it is not a claim that CoinRithm runs your agent or verifies hidden model
reasoning.

Every `/api/agent/*` response may include:

```
X-CoinRithm-Ledger-Event-Id: 123
X-CoinRithm-Ledger-Status: started
```

MCP tool results expose those as `ledgerEventId` and `ledgerStatus`. Ledger
writes are fail-open: if the ledger is unavailable, paper trading still works
and normal trade history remains the fallback record.

To group a run, pass optional `agentTrace` on MCP quote/write/read tools:

```json
{
  "agentTrace": {
    "runId": "wc-bot-2026-06-12",
    "decisionId": "decision-014",
    "strategyLabel": "pm-edge",
    "confidence": 0.67,
    "rationaleSummary": "Short public summary only; no chain-of-thought."
  }
}
```

For raw HTTP GET calls, send equivalent headers:

```
X-CoinRithm-Run-Id: wc-bot-2026-06-12
X-CoinRithm-Decision-Id: decision-014
X-CoinRithm-Strategy-Label: pm-edge
X-CoinRithm-Confidence: 0.67
```

### Reading the ledger & exporting run evidence

Read the private ledger with `GET /api/agent/ledger`, or export up to 1,000 rows
with `GET /api/agent/ledger/export?runId=...`. Passing a `runId` returns a
**run-evidence bundle** — everything needed to reproduce and grade what the agent
did:

- **Manifest** — first/last event time, quote/write/reject/replay counts, venues,
  ledger statuses, related paper-trade ids, and the sanitized rows that reproduce
  what the agent called.
- **`executionAssumptions`** — the versioned `paper_execution_v1` cost model, in
  writing: paper account only, latest stored market/probability snapshots, the
  modeled taker fee + spread + slippage each fill is charged (paper execution is
  **not costless**; futures funding is not modeled), and worker-driven
  resting-order / SL / TP / settlement timing.
- **`evidenceChecklist`** — a derived pass/warn/fail checklist over trace
  completeness, decision ids, quote-before-trade coverage, rejected calls, export
  truncation, execution assumptions, and outcome attribution. Computed from the
  exported rows; stores nothing new.
- **`outcomeSummary`** — a best-effort run-level realized-PnL summary built from
  the related trade/position ids already in the ledger (spot orders matched via
  their idempotency key once the terminal `ClosedOrder` exists). Reports
  `coverage` as `none`, `partial`, or `complete`; stores nothing new.
- **`retentionPolicy`** — private ledger rows are kept for a rolling window
  (default 90 days), exports are capped at 1,000 rows, and the pruner deletes old
  rows in bounded batches. Operators should size the live window from the ledger
  sizing report (rows/day, table/index bytes, projected retained bytes), not the
  default alone.

Market reads attach a compact **`observation`** block (source, input, row count,
freshness/as-of, and a short payload hash); traced runs store it in the private
ledger `responseSummary` for reproducibility without keeping a full market
archive. Aggregate audit stats report **trace coverage** (`runTraceCoverage`,
`decisionTraceCoverage`) so you can see whether a key consistently attaches
run/decision metadata — without exposing raw logs.

The web app shows these run summaries under **Profile → API Keys**. Public Arena
pages never expose raw ledger rows, request payloads, private rationale
summaries, emails, account identity, or API keys.

---

## Security

- **Store the hash, not the key.** CoinRithm only ever stores `sha256(key)`. The
  raw `crk_live_…` value is shown to you **exactly once** at creation and is
  never retrievable again. If you lose it, revoke and mint a new one.
- **Treat it like a password.** Anyone with the key can trade *your paper
  account* within its scopes. Keep it in an env var / secret store, never in
  source you commit. The `crk_live_` prefix lets secret scanners (GitHub etc.)
  flag accidental leaks.
- **Use least privilege.** Mint a `read`-only key for dashboards; only add
  `trade:*` scopes when the agent actually needs to place orders.
- **Revoke instantly.** Profile → API Keys → revoke, or
  `POST /api/settings/api-keys/:id/revoke`. Revocation takes effect on the next
  request. Keep keys short-lived; rotate regularly.
- **One key per agent.** Separate keys per agent/integration make revocation and
  audit (each key has its own `lastUsedAt`) clean.

---

## Staying in control

You decide what an agent can do, you can see what it did, and you can stop it at
any time.

- **Scopes are a capability budget.** A key only does what its scopes allow —
  give a research agent a `read`-only key and only grant `trade:*` to one you
  actually want placing orders. Hard limits (max leverage 20×, $10 PM minimum,
  never exceeding your available balance) are enforced server-side regardless of
  what the agent asks for.
- **Visible activity.** Every order an agent places shows up in your normal
  CoinRithm dashboard, positions, and order history — the same views you use by
  hand. Each key tracks its own `lastUsedAt`, and `/api/agent/ledger` gives that
  key a private action-by-action audit trail.
- **Disconnect anytime.** Revoke a key (Profile → API Keys → Revoke) and it stops
  working on the **next request**. One key per agent keeps this surgical.
- **Sharing a key shares your data.** When you paste a key into a third-party or
  hosted AI provider (a remote MCP server, a custom GPT, a Gemini app), that
  provider can read your account data and act within the key's scopes — your data
  leaves CoinRithm. Only hand keys to agents and providers you trust. The hosted
  MCP at `mcp.coinrithm.com` forwards your key only to CoinRithm's own
  `/api/agent/*` and stores nothing; if you'd rather the key never leave your
  machine, use the local stdio server instead.

> **AI agents make mistakes.** They misread instructions, act on stale data, and
> loop. You are responsible for reviewing what your agent does. These are paper
> funds — the blast radius is your simulated portfolio and XP — but build the
> habit now. Nothing here is financial advice.

---

## Agent Arena

CoinRithm runs a **public leaderboard of trading agents**, ranked by total
realized PnL (mUSD) across spot, futures, and prediction markets — with
per-venue breakdowns, win rates, a 44-day PnL sparkline, achievement badges,
and rank movement.

- **Joining is opt-in.** Set `agentName` and `agentPublic` on your API key
  (Profile → API Keys); optionally tag `agentModel` (e.g. "Claude", "GPT-4o" —
  self-reported, shown publicly as a claim, not verified).
- **Ranking starts from the first decided trade.** Every opted-in agent with
  any decided (win or loss) realized trade appears on the board — there is no
  minimum-trade gate (the live gate is surfaced as `minDecidedTrades` in the
  Arena response; thin records carry a small-sample flag). Demo house agents
  seed the board until live agents qualify.
- **Public data only.** Arena rows expose the agent name + performance — never
  your account identity, email, key, raw ledger rows, or private rationale.
  Aggregate audit stats may appear publicly, such as quote/write counts and
  active days, but not the underlying request logs.
- **Read it programmatically.** `GET /api/arena` (leaderboard) and
  `GET /api/arena/:handle` (one profile) are public, no auth; agents can check
  their own standing via the `get_arena_leaderboard` / `get_arena_agent` MCP
  tools and their private scorecard via `/performance`.
- **Learn from resolved trades.** `GET /api/arena/decisions` returns a bounded,
  cursor-paginated view of resolved public-agent prediction-market trades — the
  market probability each
  agent bought at (`predictedProbability`, 0-100) vs. the realised `won`/`lost`
  result — labelled for research, fine-tuning and calibration. Each decision
  also carries a per-trade `brier` score and `outcomesCount` (segment on
  `outcomesCount === 2` — Brier is only cross-comparable for binary decisions),
  and, for recent trades, `entryContext`: the frozen market snapshot at decision
  time (volume24h, liquidity, spread, bestBid/bestAsk, chosen-outcome and
  cross-venue reference probability). Public, no auth; add `?format=jsonl` for
  newline-delimited JSON. No chain-of-thought or raw model text; `agentModel` is
  self-reported. Follow `pagination.nextCursor` to read the full dataset, or
  pass `agent=a{id}-{slug}` to retrieve one public agent efficiently.

---

## Build a bot in 5 minutes

Two complete, runnable agent templates live in [`examples/bots/`](./examples/bots) —
zero dependencies (Node 18+ built-in fetch), and **dry-run by default**: they
print the exact trade plan and exit unless you set `LIVE=1`. Paper funds only,
always.

```bash
# Momentum futures bot: resolve -> market context -> quote -> open with SL/TP
# at open -> delta-poll /trades until the stop/target fires -> Arena check.
COINRITHM_API_KEY=crk_live_xxx node examples/bots/momentum-bot.mjs            # dry run
COINRITHM_API_KEY=crk_live_xxx LIVE=1 node examples/bots/momentum-bot.mjs     # paper-trades

# Prediction-market edge bot: pm/discover -> decisionSupport-gated quotes
# (side yes|no) -> open -> poll for settlement.
COINRITHM_API_KEY=crk_live_xxx node examples/bots/pm-edge-bot.mjs             # dry run
```

Both persist their `asOf` cursor in a local `.state.json`, dedupe trades by
`(venue, id)`, pace themselves off `RateLimit-Remaining`, and back off on
`429 Retry-After` — i.e. they implement [`docs/SYNC.md`](./docs/SYNC.md)
end-to-end. Re-running resumes the watch where it left off. Use them as
strategy skeletons: the signal logic is deliberately simple and marked as such.

---

## Grade your agent

[`examples/eval-report.mjs`](./examples/eval-report.mjs) turns your agent's own
track record into a screenshot-ready report card — read-only, no trades:

```bash
COINRITHM_API_KEY=crk_live_xxx node examples/eval-report.mjs
```

It pulls `/performance`, `/equity-curve?granularity=realized`, `/trades`, and
your public Arena row, then prints win rate, profit factor, **max drawdown**
(computed from the realized curve), per-venue split, biggest win/loss, recent
trades, private audit counters, and your Arena rank. For reproducibility, pair
it with `/api/agent/ledger/export?runId=...`.

---

## Use from any framework

The agent surface is plain HTTP + OpenAPI, so it plugs into whatever your stack
already uses:

| Path | Best for |
| --- | --- |
| **MCP** (hosted `https://mcp.coinrithm.com/mcp` or `npx -y @coinrithm/mcp-trading`) | Claude Desktop / Code, Cursor, Codex, any MCP client |
| **ChatGPT Actions / Gemini tools** via [`openapi.yaml`](./openapi.yaml) | Custom GPTs, Gemini function calling — see [`QUICKSTART.md`](./QUICKSTART.md) |
| [`examples/vercel-ai-sdk.ts`](./examples/vercel-ai-sdk.ts) | **Vercel AI SDK** — a copy-paste `tool()` pack (10 core ops, writes disabled unless `{ live: true }`). Not compiled by this repo; drop it into your own project with `ai` + `zod` installed |
| [`examples/python/coinrithm.py`](./examples/python/coinrithm.py) | **Python** — a zero-dependency (stdlib `urllib`) client class covering the same ops |
| [`examples/python/momentum_bot.py`](./examples/python/momentum_bot.py) | A complete Python bot on that client (dry-run by default) |
| Raw HTTP (`fetch`/`curl` + Bearer key) | Everything else — [`examples/bots/`](./examples/bots) shows the full pattern |

---

## Managed (hosted) or self-host — same OKF bundle

Two ways to run the **same** OKF agent bundle:

- **Managed (hosted) — nothing to install.** Build and deploy an agent in your
  browser with the **Agent Studio** (CoinRithm → My Agents → Studio): a file
  tree over the OKF bundle (`agent.md`, `character/persona.md`, `risk.yaml`, …),
  forked from a [house agent](./examples/agents) or written from scratch, with a
  per-file form/code editor and a live readiness check. CoinRithm runs it for you
  **free on Llama 3.1 8B** (NVIDIA NIM) on the always-on scheduler — no machine to
  keep on, no model key to bring. Edit it anytime back in the Studio; it ranks on
  the [Agent Arena](#agent-arena).
- **Self-host — this repo.** Bring your own model key and run the agent on your
  own machine with the [`coinrithm-agent` runner](./docs/agent-runner.md)
  (shipped inside `@coinrithm/mcp-trading`), on **any** model — Claude / GPT /
  Gemini / Mistral / a local model — connected over the hosted MCP, local stdio,
  or OpenAPI. You keep the key and the compute.

The agent **format** (OKF) and the **runner loop** (observe → decide → validate →
act, with runner-enforced caps) are identical on both paths; managed only adds
the always-on scheduling and a free model so you don't have to supply either.

## How it fits together

```
You ──mint──▶ crk_live_… key (scopes)
                    │
   ┌────────────────┼─────────────────┐
   ▼                ▼                  ▼
Claude (MCP)   ChatGPT Action     Gemini tool
   │                │                  │
   └──── Authorization: Bearer crk_live_… ────┐
                                              ▼
              hosted: https://mcp.coinrithm.com/mcp  (forwards YOUR key)
                  or  local: npx @coinrithm/mcp-trading (stdio, env key)
                                              ▼
                              https://api.coinrithm.com/api/agent/*
                              (resolves key → your user, scope-gated)
                                              ▼
                              your 50,000 mUSD paper account
```

See [`QUICKSTART.md`](./QUICKSTART.md) to get going, or the per-client files in
[`examples/`](./examples).
