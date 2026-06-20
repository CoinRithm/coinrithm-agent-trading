# Changelog

All notable changes to `@coinrithm/mcp-trading` are documented here. The package
ships two binaries — `coinrithm-mcp` (the MCP server) and `coinrithm-agent` (the
self-host agent runner) — versioned together. The CoinRithm **API contract** is
versioned separately (see `openapi.yaml` `info.version`, currently `1.4.0`).

## 0.4.0

- **Deterministic scorecard engine (`computeScorecard`).** The reproducible-
  evaluation engine for `coinrithm.agent.scorecard.v1` — pure math over an
  agent's realized track record (no network, no model): realized PnL, win rate,
  expectancy, profit factor, reward-to-risk, Sharpe, Sortino, deflated /
  probabilistic Sharpe (Bailey & López de Prado — skill vs luck with a multiple-
  testing penalty), max drawdown, and Brier + ECE calibration for probabilistic
  calls. Same inputs → identical metrics **and** a sha256 `contentHash` of the
  canonicalized result, so a scorecard whose hash doesn't reproduce isn't
  trusted. Metrics are computed AFTER the run from immutable evidence (leakage-
  separation), so tuning-to-the-metric is structurally impossible. Returns
  `null` for thin records — never a fabricated number.
- **Resolver: committable file metadata + functionality pin.** The OKF resolver
  now carries per-file metadata and pins functionality through resolution, so a
  bundle's behavior is reproducible from its committed files.

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
