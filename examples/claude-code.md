# Claude Code setup

Add the CoinRithm trading MCP server to Claude Code.

> Paper trading only — virtual funds. Not financial advice.

## 1. Add the MCP server

**Primary — hosted (nothing to install).** One command, key as a header
(minted in CoinRithm → Profile → API Keys):

```bash
claude mcp add coinrithm-trading \
  --transport http https://mcp.coinrithm.com/mcp \
  --header "Authorization: Bearer crk_live_REPLACE_ME"
```

**Alternative — local stdio via npm** (key stays on your machine):

```bash
claude mcp add coinrithm-trading \
  --env COINRITHM_API_KEY=crk_live_REPLACE_ME \
  -- npx -y @coinrithm/mcp-trading
```

Scope flags (optional): add `--scope user` to make it available across all your
projects, or `--scope project` to share it via the repo's `.mcp.json`. Default is
local to the current project.

Verify:

```bash
claude mcp list
```

You should see `coinrithm-trading` listed. In a session, ask Claude to *"call
whoami on CoinRithm"* to confirm the key resolves.

## 2. (Recommended) Install the trading skill

Copy `skills/coinrithm-trader/` into your Claude Code skills directory so Claude
picks up the trading playbook + hard risk rules (confirm-before-write, leverage
≤ 20x, side-aware SL/TP corridors, PM stake ≥ $10, never exceed available
balance, delta polling with `updatedSince`, 429 back-off). The skill
auto-triggers on phrases like "paper trade", "open a position", or "check my
portfolio".

## Removing it

```bash
claude mcp remove coinrithm-trading
```

---

### Contributors: running from source

Only needed if you are hacking on the server itself:

```bash
cd packages/mcp-trading
npm install
npm run build
claude mcp add coinrithm-trading \
  --env COINRITHM_API_KEY=crk_live_REPLACE_ME \
  -- node /ABSOLUTE/PATH/TO/coinrithm-agent-trading/packages/mcp-trading/dist/index.js
```
