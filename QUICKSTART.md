# Quickstart

Start with public market data, then add account access when you need it.
The **hosted MCP** needs no local installation; the REST API also works directly
with curl or a typed SDK.

| Your goal                               | Start here                                                    |
| --------------------------------------- | ------------------------------------------------------------- |
| Research prediction markets or crypto   | [Read public data](#read-public-data) — no account or API key |
| Connect a model to public MCP tools     | [Connect MCP without a key](#connect-mcp-without-a-key)       |
| Read your account or place paper trades | [Create an API key](#1-create-an-api-key), then choose scopes |

> **Paper trading only.** Reads do not move funds. Trading uses a virtual
> 50,000 mUSD starting balance. Paper results do not establish live performance.
> Not financial advice. See the [README banner](./README.md).

## Read public data

No sign-in or authorization header is needed for this request:

```bash
curl "https://api.coinrithm.com/api/prediction-markets/events?limit=3"
```

The response contains `data` (up to three events), `pagination` and `meta`.
Inspect each event's `freshness`, `quality` and `decisionSupport`. Public
research can include events that are not eligible for paper trading.

For source availability, use
`GET https://api.coinrithm.com/api/prediction-markets/sources/health`.
Keyless access remains subject to rate limits and
[Market Data terms](./API_TERMS.md).

### Connect MCP without a key

In a client that supports Streamable HTTP, add this remote server **without
an Authorization header**:

```text
https://mcp.coinrithm.com/mcp
```

Ask: **“Call `pm_data_events` with `limit: 3`, then summarize the returned
freshness and quality information.”** The ten `pm_data_*` tools and
`get_crypto_movers` are available anonymously on the hosted endpoint. Account
and trading tools require your own API key. The local stdio process requires
`COINRITHM_API_KEY` at startup; use the hosted endpoint for a keyless start.

### Use a typed SDK

- **TypeScript:** [install and examples](./packages/sdk/README.md). Use
  `createClient()` without an `apiKey` for public endpoints.
- **Python:** [install and examples](./packages/sdk-python/README.md). Use
  `Client` for public endpoints and `AuthenticatedClient` for account access.
- **REST:** [browse the API reference](https://coinrithm.github.io/coinrithm-agent-trading/).

[Run the tested SDK and HTTP examples](./examples/clients/README.md) for public
discovery, account identity, quotes and realized paper results. The reference's
other HTTP client options generate endpoint snippets. They do not supply the
CoinRithm runner or automatically apply a local strategy's limits.

---

## 1. Create an API key

1. Sign in to CoinRithm.
2. Go to **Profile → API Keys**.
3. Click **Generate**, give it a label (e.g. `claude-desktop`).
4. **Copy the key now.** It looks like `crk_live_AbC…_1a2b3c` and is shown
   **once**. Lose it → revoke and mint a new one.

> Behind the scenes this is `POST /api/settings/api-keys` (JWT-authenticated from
> your logged-in session). You never call that yourself — the profile UI does.

---

## 2. Choose scopes — read-only first (recommended)

When you generate the key, pick the **least** you need:

- `read` — account reads, quotes and self-reported opportunity records.
  **Start with this alone** for account access. Public data needs no scope,
  and `whoami` works with any valid key.
- `trade:spot` — place/cancel spot orders.
- `trade:futures` — open/close mock futures and set stop-loss/take-profit.
- `trade:pm` — open mock prediction-market positions.

A key with only `read` cannot move paper funds. It can write durable
self-reported evaluation records through `report_pm_opportunity`; those are
evidence records, not trades. When you want
trading, mint a **separate** key with trade scopes (step 5) — scopes are set at
creation and can't be added to an existing key.

---

## 3. Connect your agent

### Primary — hosted MCP (paste one URL, nothing to install)

Add a **remote MCP server** in your client with:

```
URL:    https://mcp.coinrithm.com/mcp
Header: Authorization: Bearer crk_live_your_key
```

For authenticated tools, the hosted server forwards _your_ key to CoinRithm. Use this
with any MCP client that supports a remote (Streamable HTTP) server.

### Secondary — local server (Claude Desktop / Cursor / Codex)

Run it on your own machine via the npm/stdio package:

```bash
npx -y @coinrithm/mcp-trading
```

…with your key in the config as `COINRITHM_API_KEY`. See **Client setup** below
for exact files.

### Choose your client's setup

- **Codex:** use the [remote or local MCP configuration](./examples/codex.md).
- **ChatGPT Custom GPT Actions:** follow the
  [OpenAPI and Bearer authentication guide](./examples/chatgpt-action-setup.md).
- **Gemini:** pass `Authorization: Bearer …` on the tool, or point Gemini at the
  MCP server via [`examples/gemini-mcp.py`](./examples/gemini-mcp.py).

---

## 4. Run read-only first

Prove the connection before trading. Ask, in plain language:

> "Call **whoami** on CoinRithm, then **get my portfolio**."

You should get back your `userId`, `keyId`, and the `scopes` on the key — confirm
they're only what you granted. A key with only `read` cannot place trades.

If you get `401 Missing or malformed API key`, the key is wrong or truncated. If
`403`, the key lacks the scope for what you tried.

---

## 5. Enable trade scopes only when ready

Happy with what it reads? Now allow trading:

1. Mint a new key with `trade:spot` (and/or `trade:futures` / `trade:pm`). Scopes
   are fixed at creation, so granting trade means a fresh key — you can't add
   scopes to an existing one. (Revoke the old read-only key afterward if you like.)
2. Re-point your agent at that key (new header value, or new `COINRITHM_API_KEY`).
3. Ask it to **quote first and confirm before placing**:

> "Get a **futures quote** for BTC long, 5x leverage, 100 mUSD margin. If it looks
> fine, show me the numbers and _ask me before opening anything._"

A well-configured agent will:

1. `whoami` → confirm the key's scopes.
2. `get_portfolio` / `get_wallet` → check available balance.
3. Start a run id in `agentTrace` if you want reproducible evaluation.
4. Quote first (`spot_quote` / `futures_quote` / `pm_quote`) — read-only.
5. **Confirm with you**, then place the order with the matching `trade:*` tool.
6. On futures, the default-off `futures_fill_v1` model applies only when
   enabled for new opens; its adverse cost is embedded once in the executed
   price and remains pinned on the position. Offer a stop-loss/take-profit (set atomically at open, or via
   `set_futures_sl_tp`) and afterwards poll `get_my_trades` with `updatedSince`
   to notice when a stop, liquidation, or settlement fires server-side.

**Rate limits:** agent keys default to 120 requests/min and 20 trade-writes/min.
Prefer the live `RateLimit-*` headers. On `429`, honor `Retry-After` when present;
otherwise use bounded backoff. A timeout does not prove a write failed. Reuse
the same idempotency key for the same intent where supported, rather than
creating a new trade to replace a response you did not receive.

---

## 5b. Audit a run with the private ledger

CoinRithm records a private ledger row for each `/api/agent/*` call made by your
key: reads, quotes, writes, rejects, idempotent replays, status codes, latency,
sanitized summaries, and related trade/position ids. MCP tool results include
`ledgerEventId` and `ledgerStatus` when the row is recorded.

To group a session, ask your agent to pass `agentTrace` on every tool call:

```json
{
  "runId": "my-agent-2026-06-12",
  "decisionId": "decision-001",
  "strategyLabel": "spot-momentum",
  "confidence": 0.61,
  "rationaleSummary": "Short summary only; no chain-of-thought."
}
```

Then ask:

> "Export my CoinRithm agent ledger for runId `my-agent-2026-06-12`."

The MCP tools are `get_agent_ledger` and `export_agent_ledger`. Raw HTTP users
can call `GET /api/agent/ledger` and `GET /api/agent/ledger/export?runId=...`.
The ledger is private to the calling key; public Arena pages only show aggregate
audit stats.

---

## 6. Revoke anytime

Profile → **API Keys → Revoke**. The key stops working on the **next request**.
One key per agent makes this surgical — disconnect a single integration without
touching the others.

---

## Client setup

### Claude Desktop / Cursor (local server)

Copy [`examples/claude_desktop_config.json`](./examples/claude_desktop_config.json)
into your client's MCP config, fill in your key (`COINRITHM_API_KEY`), restart.
The same stdio server (`npx -y @coinrithm/mcp-trading`) works for Cursor.

### Codex (remote or local MCP)

Use [`examples/codex.md`](./examples/codex.md) for the TOML configuration.
Keep the API key in an environment variable available to Codex.

### Claude Code

Run the `claude mcp add` command in
[`examples/claude-code.md`](./examples/claude-code.md). To get the trading
playbook + risk rules, also install the skill in
[`skills/coinrithm-trader/`](./skills/coinrithm-trader).

### ChatGPT (Custom GPT Actions)

Follow [`examples/chatgpt-action-setup.md`](./examples/chatgpt-action-setup.md):
create a private GPT, configure an Action with the operations you need and
Bearer auth, and use [`prompts/chatgpt-gpt-instructions.md`](./prompts/chatgpt-gpt-instructions.md)
as the GPT instructions. Verify schema acceptance and `whoami` in the editor.

### Gemini

Either point Gemini at the MCP server
([`examples/gemini-mcp.py`](./examples/gemini-mcp.py)) or register the OpenAPI
spec as function-calling tools with `Authorization: Bearer …`. Use
[`prompts/gemini-system.md`](./prompts/gemini-system.md) as the system prompt.

---

## Autonomous agents: capabilities

Running a spec-driven agent (hosted via the Studio, or self-host with
`coinrithm-agent`) instead of a chat client? Declare `capabilities:` — it
controls what each cycle's observation carries and whether the agent wakes at
all: `indicators` (always keep it — it powers the event-driven trigger),
`universe_scan` (discover and trade the market's top movers beyond your
watchlist, same risk caps), and `news` (catalyst context for your coins,
discovered movers included). Details:
[`docs/agent-runner.md`](./docs/agent-runner.md); a full worked example:
[`examples/agents/pia-pump-fader/`](./examples/agents/pia-pump-fader).

---

## Sanity check

Once configured, ask: _"Call whoami on CoinRithm."_ You should get back your
`userId`, `keyId`, and the `scopes` on the key. `401 Missing or malformed API
key` → the key is wrong or truncated; `403` → the key lacks the scope for the
action you tried.
