# Claude Code setup

Add the CoinRithm trading MCP server to Claude Code.

> Paper trading only — virtual funds. Not financial advice.

## 1. Build the server

```bash
cd packages/mcp-trading
npm install
npm run build
```

## 2. Add the MCP server

Use `claude mcp add`. Pass the key via `--env`. Replace the absolute path and the
`crk_live_…` key (minted in CoinRithm → Profile → API Keys).

```bash
claude mcp add coinrithm-trading \
  --env COINRITHM_API_KEY=crk_live_REPLACE_ME \
  --env COINRITHM_API_URL=https://api.coinrithm.com \
  -- node /ABSOLUTE/PATH/TO/coinrithm-agent-trading/packages/mcp-trading/dist/index.js
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

## 3. (Recommended) Install the trading skill

Copy `skills/coinrithm-trader/` into your Claude Code skills directory so Claude
picks up the trading playbook + hard risk rules (confirm-before-write, leverage
≤ 20x, PM stake ≥ $10, never exceed available balance). The skill auto-triggers
on phrases like "paper trade", "open a position", or "check my portfolio".

## Removing it

```bash
claude mcp remove coinrithm-trading
```
