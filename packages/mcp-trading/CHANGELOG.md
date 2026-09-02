# Changelog

All notable changes to `@coinrithm/mcp-trading` are documented here. The package
ships two binaries — `coinrithm-mcp` (the MCP server) and `coinrithm-agent` (the
self-host agent runner) — versioned together. The CoinRithm **API contract** is
versioned separately (see `openapi.yaml` `info.version`, currently `1.7.0`).

## Unreleased

**Thesis exits.** Every opening action (`futures_open`, `spot_order`,
`pm_open`) now carries a `thesis`: a one-sentence summary plus an
`invalidation` with at least one machine-checkable condition (`priceBelow` /
`priceAbove` for coins, `probabilityBelow` / `probabilityAbove` for prediction
markets, a `maxHoldMinutes` time stop, and a free-text `catalyst` the model
re-judges itself). The runner binds the thesis to the position the server
returns, sanitized side-aware (a rising price never invalidates a long; a
wrong-side level is dropped rather than re-signed; the time stop is clamped to
60 minutes .. 30 days), persists it in the run state (`RunState.theses`, the
same state file / `agent_state` JSON as before, no schema change) and
re-evaluates it every cycle. A futures position whose price level or time stop
is breached is closed by the runner before the model is asked anything, logged
as a `thesis_invalidated` exit with its own idempotency key, after the
kill-switch and drawdown checks and never instead of them. Prediction-market
positions have no close endpoint, so a broken PM thesis is surfaced to the
model instead (do not add, let it settle). The parser is tolerant (a malformed
thesis never fails the open; a thesis copied onto a close is ignored) and the
structured-output schema requires it, so schema-enforced hosted models always
emit one.

**Fundamentals in the observation.** Each watch entry now carries
`fundamentals` sourced only from calls the runner already makes: `categories`,
`marketCapRank` and `marketCapUsd` from the market context; `volume24hUsd` from
the candles the `indicators` capability already fetches (live-probed
2026-09-02: each bar's `v` is a rolling 24h volume, so the latest bar is the
24h figure, never the sum); and up to three `headlines` with `publishedAt`
timestamps from the one `news` call, attributed through the curated coin-news
graph. Discovered PM markets carry `endDate` and `liquidityUsd`; open PM
positions carry their title, side, entry and current probability and
`openedAt`; open futures positions carry `openedAt`. The system prompt states
the thesis contract, the runner-enforced exit and how to grade a trade on the
fundamentals. Not carried, because no agent endpoint serves them: an "about"
text per coin, a 24h probability change and a cross-venue divergence per PM
market.

**Fix:** the public movers feed serializes `change24h` / `currentPrice` as
decimal strings; the universe-scan context rows read them strictly as numbers
and shipped `undefined` for every mover.

## 0.7.7

Reliability release. Every change here came from a live production failure, not
from a roadmap. Additive: no tool renamed or removed, and the API **contract
stays 1.7.0** because nothing on the documented surface changed.

**Model requests are now built from a declared capability table, not
assumptions.** `providerCapabilities.ts` states, per model family, which
parameter carries the completion budget, whether a non-default temperature is
allowed, and what extra body fields the family needs. Two failures this fixes:

- **OpenAI's current models rejected our requests outright.** `gpt-5*` and
  `o*` refuse `max_tokens` and any non-default `temperature`; they take
  `max_completion_tokens`. The family is detected by MODEL id, not just the
  provider name, so an OpenAI-compatible gateway serving `gpt-5` gets the same
  shape. If you brought your own OpenAI key, this is why it now works.
- **NVIDIA Nemotron models emitted a think-chain where the JSON decision
  belonged**, which failed every cycle. The `chat_template_kwargs.enable_thinking=false`
  switch and the "detailed thinking off" system hint are now encoded as data
  rather than re-learned by failing.

**New: `probeDecisionContract()`.** An HTTP 200 is not proof a route can run an
agent. Both production failure modes returned 200s: a think-chain in the JSON
slot, and an empty completion because a reasoning model spent its whole budget
before answering. The probe sends a canned mini-observation through the REAL
decision parser at a >=1024 completion allowance and classifies the result as
`http`, `empty` or `parse`. Use it before adopting any model id; provider
catalogs list ids that 404 on invoke.

**Provider trouble no longer disables an agent.** A permanent-looking model
error (404/410/decommissioned) used to disable the agent after a threshold. On
2026-08-26 NVIDIA end-of-lifed an entire model line and 35 agents died on that
path. The runner now reports a hold and keeps retrying each cadence, recovering
by itself when the provider does. Disables remain for what deserves them:
revoked credentials, drawdown, kill-switch, user action.

**Failures carry structured metadata.** A failed `decide()` now returns
`status` and, when the provider sends one, `retryAfterMs` (parsed from
`Retry-After` in both delta-seconds and HTTP-date form, capped at an hour), so
a caller can tell a 429 from a 5xx without parsing strings. Error text is
unchanged.

**`ClientConfig.extraHeaders`.** Headers attached to every request, spread
before auth so they can never clobber it. Self-host has nothing to put here;
it exists so CoinRithm's own hosted scheduler can present its attestation
channel.

**Model names corrected throughout.** The retired Llama 3.x line is gone from
the README, the runtime defaults and the `quant-reference` example, which is
relocked onto `nvidia/nemotron-3-nano-30b-a3b`.

## 0.7.6

Agent capability release: universe discovery, first-class behavioral guards,
and the hosted prose budget made visible. Additive — no tool renamed or
removed. Contract moves to **1.7.0** (two keyless paths declared).

**New: agents can look beyond their own watchlist.**

- **`get_crypto_movers` tool.** Keyless scan of the tracked coin universe for
  the biggest 24h gainers or losers. Rows carry `coinId`, `symbol`, `name`,
  `slug`, `change24hPct`, `priceUsd`.
- **`universe_scan` capability** for the self-host runner. Each cycle it pulls
  the top movers, promotes the strongest few into full watch entries marked
  `discovered: true`, and passes the remainder as compact context. Watchlist
  and blocklist symbols are excluded up front, so a discovered row can never
  duplicate a configured pair or bypass the deny list.
- **Both now carry the coinId through.** The movers row's `ucid` IS the
  `coinId` that `get_candles` / `get_market_context` / the futures quote path
  take. It was previously stripped from the tool response and re-derived from
  the SYMBOL via a resolve round-trip — a wasted call per discovered mover and
  a real correctness hazard, because symbols collide across listings and the
  resolver could return a different coin than the one that actually moved.

**New: contract declares the endpoints the tools call.**

- `/api/coins/top-gainers` and `/api/coins/top-losers` are now in
  `openapi.yaml` (tag `public-crypto-data`), so both SDKs can reach the
  surface `get_crypto_movers` uses. Probe-verified against prod: bare array,
  no envelope; `change24h` / `currentPrice` are decimal STRINGS; default
  `limit` is 3 and out-of-range values return 400 rather than clamping.

**New: personality and boundaries are configurable, and documented.**

- **`character/guards.md`** — first-class hard behavioral guards, merged into
  the strategy prose as a distinct section rather than buried in the thesis.
- **`examples/agents/pia-pump-fader`** — a full bundle demonstrating
  capabilities plus boundary configuration (watchlist/blocklist interaction,
  the five-point risk gate, re-entry discipline).
- **`examples/agents/FORKING.md`** — a file-by-file map of what is strategy
  and what is plumbing, so a fork knows what it is allowed to change.
- **QUICKSTART** documents capabilities, and a docs-drift tripwire fails the
  suite when a capability ships undocumented (`universe_scan` shipped
  invisible in every user surface once; that cannot recur silently).

**Fixed.**

- **Hosted prose budget is validated, not discovered at deploy.**
  `coinrithm-agent validate --hosted` now checks the 8,000-character merged
  prose budget and reports the exact overage. A bundle could previously
  validate clean and still be undeployable. YAML frontmatter is stripped
  before the count (and before the model sees it — it was being fed in as if
  it were strategy). `pia-pump-fader` was rebuilt to fit at 7,932.
- **Permanent failures stop being revived.** A disabled agent whose model is
  gone or whose key is invalid is no longer resurrected by the scheduler's
  revive pass; only transient failures are retried.
- **Fresh scaffolds are no longer bricked** by the capabilities field, and
  action-confidence tolerance was widened to match what models actually emit.
- **False market-data licensing assertion corrected** in both READMEs.

⚠ Publishing to npm remains a **manual** step — `publish-mcp.yml` pushes
`server.json` to the MCP registry only.

## 0.7.5

**Release-hygiene bump. Everything below was already merged but never
reached npm** — the 0.7.4 tarball was published 2026-07-26T23:01:11Z and
five commits landed after that instant without a version bump, so the
repository's 0.7.4 and the published 0.7.4 were different code under one
version number. This release makes the published artifact match the
source again.

- **Security.** MCP dependency audit fixes, 6 findings to 0 (`da65e9e`).
  Anyone on published 0.7.4 is running the pre-audit dependency set.
- **`pm_data` Gemini exposure** for agents (`3ab04ae`).
- **Venue methodology and health** exposed as tools (`74cc495`).
- **Reproducible decision receipts** persisted by the agent runner
  (`8bebc9e`).
- **Docs.** Contract version drift corrected and the placeholder SDK
  README replaced, so the docs stop advertising an install that 404s
  (`6d61b92`).

No tool was renamed or removed; this is additive plus a dependency
refresh.

⚠ Publishing this package is a **manual** step — `publish-mcp.yml` only
pushes `server.json` to the MCP registry, it does not run `npm publish`.
That asymmetry is exactly how the drift above accumulated unnoticed.

## 0.7.4

Docs-only. No tool behavior change, no API-surface change.

- **Acceptable Use of Market Data.** The README (root and this package) and
  `openapi.yaml` (`info.termsOfService`, `info.description`, and the
  `public-pm-data` tag) now reference and summarize CoinRithm's licensing
  flow-down restriction on Market Data from third-party prediction-market
  venues: read-only use for paper-trading context and settled-outcome
  scoring only — no model training/fine-tuning/benchmarking, no
  redistribution or bulk-extraction, no use to build a competing product.
  Full terms: <https://www.coinrithm.com/en/terms-of-use>

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
- **ForecastEx venue truth.** Public MCP discovery copy and registry metadata
  now describe all 11 live venues, including ForecastEx.
- **Contract synchronization.** Runner templates and example bundles pin the
  served OpenAPI 1.6.0 contract; canonical scorecard paths are unambiguous.

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
