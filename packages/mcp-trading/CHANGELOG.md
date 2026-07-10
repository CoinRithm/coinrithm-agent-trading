# Changelog

All notable changes to `@coinrithm/mcp-trading` are documented here. The package
ships two binaries — `coinrithm-mcp` (the MCP server) and `coinrithm-agent` (the
self-host agent runner) — versioned together. The CoinRithm **API contract** is
versioned separately (see `openapi.yaml` `info.version`, currently `1.5.0`).

## 0.7.3

Quality-engine surfaces + independent forecasts. Additive; no breaking change.

- **Quality verdicts in tool responses.** `discover_pm_markets`, `pm_quote`, and
  the `pm_data_*` tools now surface the persisted truth-engine `quality` object
  (`decisionEligible`, warning/block reason codes, `policyVersion`, `assessedAt`).
  Markets with critical failures stay visible but cannot drive paper opens or
  alerts.
- **`openBlocked` preview on `pm_quote`.** Quotes preview the open-time quality
  gate (`openBlocked` + `openBlockReasons`), so an agent can skip a market that
  would 422 before burning the open attempt. The self-host runner
  (`coinrithm-agent`) does this skip automatically.
- **Independent forecasts in the runner.** The self-host agent runner elicits the
  model's OWN probability (judged from the question/resolution criteria/deadline,
  never anchored to the market price) and submits it as `forecastProbability` on
  PM opens — feeding the public calibration dataset with proper-scoring-rule
  forecasts. Clamped to [1,99]; omitted (never faked) when the model does not
  produce one; `HOUSE_AGENT_FORECAST_ENABLED=false` disables.
- **`crossPlatform` on event lists** documented in the API contract: sibling
  venues pricing the same question, on list rows.

## 0.7.2

Docs-truth + privacy release. No tool behavior change, no API-surface change.

- **Ten venues in the public listing.** `pm_data_*` tool copy, the README, and
  `server.json` now name all ten venues (adds Futuur and Myriad). npm `0.7.1` was
  published before those landed, so the registry listing still advertised "eight
  venues"; npm versions are immutable, so correcting the public listing required
  a new release.
- **`source` parameter description** on `pm_data_events` / `pm_data_event_detail`
  now enumerates all ten venue slugs. Accepted values are unchanged — this is
  description text only, which is why it is a patch and not a minor.
- **Privacy.** Raw model output is no longer persisted, enforcing the package's
  no-chain-of-thought promise.
- **New tripwire.** `server.json` (the MCP-registry listing) is now guarded
  against version and venue-count drift; it had no guard, which is how it went
  stale in the first place.
- Refreshed stale Arena-gate example copy.

## 0.7.1

Docs + registry-metadata release; no tool behavior changes.

- **README refresh**: the keyless `pm_data_*` data surface is now front and
  center — 8 venues (Polymarket, Kalshi, Smarkets, Limitless, Manifold,
  Metaculus, PredictIt, Rothera — the "seven venues" line predated Rothera),
  the anonymous hosted-endpoint path, and the `referenceProbability` /
  `volumeHistory` fields the data tools return.
- **`server.json`**: hosted endpoint's `Authorization` header marked optional
  (the `pm_data_*` tools work anonymously — verified live) and the server
  description now leads with the keyless data surface.
- Ships the post-0.7.0 commits: `pm_data_event` advertises `volumeHistory`,
  `pm_data_events` advertises `referenceProbability` on list items, and the
  hosted MCP root (`GET /`) serves a self-describing JSON landing (with a
  405 + hint on `GET /mcp`).

## 0.7.0

(Retroactive entry — released 2026-07-05 without a changelog note.)

- **Four keyless `pm_data_*` tools** — CoinRithm's free public cross-venue
  prediction-market dataset over MCP, no API key required and yours is never
  attached: `pm_data_overview` (market-wide stats), `pm_data_events`
  (cross-venue event list), `pm_data_event` (detail incl.
  `crossSourceMatches` + resolution evidence), `pm_data_whales`
  (large-trade tape).

## 0.5.0

Agent-runner quality + reliability release. `coinrithm-agent` got materially
smarter and less noisy; `coinrithm-mcp` is unchanged in shape. Bundles the work
since 0.4.0.

- **Prediction markets are a first-class venue** in the decide prompt: a short
  `pmN` ref so small models trade PM reliably, eligible-outcome filtering (only
  backend-openable outcomes reach the model), and futures-capped agents steered
  to PM (a separate budget) instead of re-rejecting.
- **PM anti-churn — now actually effective.** The candidate list is pre-filtered
  to exclude markets the agent already holds, and the runner + server both block
  re-betting a held market+outcome (no more one-agent, 25-identical-bets churn).
  An earlier version read the wrong `/positions/pm` fields and was silently dead;
  fixed.
- **Settlement-feedback learning loop.** The agent sees how its own recent bets
  actually resolved (win/loss/void + realized PnL) as reflective context, so it
  learns from outcomes across cycles.
- **Per-trade reasoning stays honest about the market.** A multi-action decision
  no longer stamps its primary rationale onto a secondary trade about a different
  market — the trade's public Arena "why" always matches the market it's on.
- **Futures reliability.** The model is unblinded to per-position mark /
  liquidation / stop / take-profit prices; take-profit is auto-clamped to a valid
  R:R target off the stop (kills the `take_profit_not_*_mark` reject waves); and a
  marking-down PM book now trips the equity-drawdown kill-switch too.
- **News capability.** Recent high-importance news for the watchlist coins is fed
  into the decide context as a market-catalyst layer.
- **Robustness + contract accuracy.** Scheduler/runner hardening, flat-state
  prompt steers (weak models stop hallucinating closes), manage-enum
  normalization, and the PM contract now documents real entry friction rather
  than a disclose-only stance.
- **Security.** `hono` bumped to 4.12.27 (high-severity advisories: serve-static
  path traversal, CORS wildcard-with-credentials, body-limit bypass).
- **Docs.** The npm README leads with value / free / OKF / Studio; stale
  scheduler and `minDecidedTrades` claims corrected.

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
