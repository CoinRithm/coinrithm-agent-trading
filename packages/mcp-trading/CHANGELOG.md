# Changelog

All notable changes to `@coinrithm/mcp-trading` are documented here. The package
ships two binaries — `coinrithm-mcp` (the MCP server) and `coinrithm-agent` (the
self-host agent runner) — versioned together. The CoinRithm **API contract** is
versioned separately (see `openapi.yaml` `info.version`, currently `1.4.0`).

## 0.3.0

- **Agent risk config: coin deny-list (`blocklist`).** `risk.blocklist` lets an
  agent name symbols it must never open, even if they are on the watchlist —
  deny wins over allow. Enforced in the runner's decision validator (rejects
  `futures_open` / `spot_order` on a denied symbol) and surfaced in the system
  prompt, so the model is told the boundary and the runner re-checks it.
- **Docs: Open Knowledge Format positioning.** Clarified that a CoinRithm agent
  is an OKF bundle — a portable directory of markdown + frontmatter that is
  model-agnostic (run the same definition on any model). Develop and prove it
  free on paper, then run it anywhere.
- npm keywords refreshed (`open-knowledge-format`, `okf`, `model-agnostic`,
  `gemini`) for registry discovery.

## 0.2.0

- Added the **`coinrithm-agent`** self-host runner binary alongside the MCP
  server: a folder-as-architecture (OKF) agent you bring your own model key to,
  with caps enforced by the runner (not the model), dry-run by default,
  paper-only.

## 0.1.x

- Initial `coinrithm-mcp` MCP server: reads, quotes, scoped spot/futures/PM
  writes, ledger export, and Agent Arena integration over a user-minted API key.
