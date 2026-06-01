# CoinRithm Agent Trading

Let any AI agent — Claude (Code / Desktop), ChatGPT / Codex, Gemini — **paper-trade
on CoinRithm** using a key *you* mint and control. Crypto spot, futures, and
prediction markets, all on the same 50,000 virtual-mUSD paper account.

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
| [`openapi.yaml`](./openapi.yaml) | OpenAPI 3.1 spec — source of truth for ChatGPT Actions & Gemini |
| [`packages/mcp-trading/`](./packages/mcp-trading) | The MCP server: hosted (HTTP, multi-user) **and** local (stdio) |
| [`skills/coinrithm-trader/`](./skills/coinrithm-trader) | A Claude **Skill** with a trading playbook + hard risk rules |
| [`prompts/`](./prompts) | Per-client system prompts |
| [`examples/`](./examples) | Drop-in config for Claude Desktop, Claude Code, ChatGPT, Gemini |

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
| `read` | Read identity, portfolio, wallet, orders, positions; price quotes | `GET /me`, `/portfolio`, `/wallet`, `/orders/open`, `/positions/*`, `POST /futures/quote`, `/pm/quote` |
| `trade:spot` | Place / cancel spot orders | `POST /spot/order`, `/spot/order/:id/cancel` |
| `trade:futures` | Open / close mock futures | `POST /futures/open`, `/futures/close` |
| `trade:pm` | Open mock prediction-market positions | `POST /pm/open` |

`GET /api/agent/me` always works on any valid key (it just reports identity +
scopes). A key missing the required scope gets `403`.

> **Note:** `POST /futures/open` and `POST /pm/open` are *additionally*
> server-flag-gated and are **dark today** — even a correctly-scoped key gets
> `403 "… not enabled"` until CoinRithm flips the flag. Quotes, reads, spot
> orders, and futures-close are live.

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
  hand. Each key tracks its own `lastUsedAt`, so a rogue or idle integration is
  easy to spot.
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
