# Quickstart

Get an AI agent paper-trading on CoinRithm — safely, in the order that keeps you
in control: key → scopes → connect → read → trade → revoke. The fastest path is
the **hosted MCP**: paste one URL and a header, nothing to install.

> **Paper trading only.** Everything below moves virtual funds (50,000 mUSD).
> Not financial advice. See the [README banner](./README.md).

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

- `read` — required for everything (portfolio, quotes, positions). **Start with
  this alone.**
- `trade:spot` — place/cancel spot orders.
- `trade:futures` — open/close mock futures.
- `trade:pm` — open mock prediction-market positions.

A read-only key can't move funds no matter what an agent asks. When you want
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

The hosted server forwards *your* key to CoinRithm on every request. Use this
with any MCP client that supports a remote (Streamable HTTP) server.

### Secondary — local server (Claude Desktop / Cursor / Codex)

Run it on your own machine via the npm/stdio package:

```bash
npx -y @coinrithm/mcp-trading
```

…with your key in the config as `COINRITHM_API_KEY`. See **Client setup** below
for exact files.

### ChatGPT / Codex & Gemini (OpenAPI)

- **ChatGPT (Actions) / Codex:** import [`openapi.yaml`](./openapi.yaml), set
  Authentication = **API Key → Bearer**, paste the key.
- **Gemini:** pass `Authorization: Bearer …` on the tool, or point Gemini at the
  MCP server via [`examples/gemini-mcp.py`](./examples/gemini-mcp.py).

---

## 4. Run read-only first

Prove the connection before trading. Ask, in plain language:

> "Call **whoami** on CoinRithm, then **get my portfolio**."

You should get back your `userId`, `keyId`, and the `scopes` on the key — confirm
they're only what you granted. A read-only key stops here by design: it can read,
not trade.

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
> fine, show me the numbers and *ask me before opening anything.*"

A well-configured agent will:

1. `whoami` → confirm the key's scopes.
2. `get_portfolio` / `get_wallet` → check available balance.
3. Quote first (`futures_quote` / `pm_quote`) — read-only.
4. **Confirm with you**, then place the order with the matching `trade:*` tool.

---

## 6. Revoke anytime

Profile → **API Keys → Revoke**. The key stops working on the **next request**.
One key per agent makes this surgical — disconnect a single integration without
touching the others.

---

## Client setup

### Claude Desktop / Cursor / Codex (local server)

Copy [`examples/claude_desktop_config.json`](./examples/claude_desktop_config.json)
into your client's MCP config, fill in your key (`COINRITHM_API_KEY`), restart.
The same stdio server (`npx -y @coinrithm/mcp-trading`) works for Cursor and
Codex MCP configs.

### Claude Code

Run the `claude mcp add` command in
[`examples/claude-code.md`](./examples/claude-code.md). To get the trading
playbook + risk rules, also install the skill in
[`skills/coinrithm-trader/`](./skills/coinrithm-trader).

### ChatGPT / Codex (Custom GPT Actions)

Follow [`examples/chatgpt-action-setup.md`](./examples/chatgpt-action-setup.md):
create a GPT, **Add action**, import `openapi.yaml`, set Bearer auth, paste your
key, and use [`prompts/chatgpt-gpt-instructions.md`](./prompts/chatgpt-gpt-instructions.md)
as the GPT instructions.

### Gemini

Either point Gemini at the MCP server
([`examples/gemini-mcp.py`](./examples/gemini-mcp.py)) or register the OpenAPI
spec as function-calling tools with `Authorization: Bearer …`. Use
[`prompts/gemini-system.md`](./prompts/gemini-system.md) as the system prompt.

---

## Sanity check

Once configured, ask: *"Call whoami on CoinRithm."* You should get back your
`userId`, `keyId`, and the `scopes` on the key. `401 Missing or malformed API
key` → the key is wrong or truncated; `403` → the key lacks the scope for the
action you tried.
