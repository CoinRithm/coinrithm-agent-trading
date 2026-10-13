# Changelog

## 0.4.0 (2026-10-13)

Generated from API contract 1.8.0. The runtime wrapper and its dependencies are
unchanged.

- Adds the keyless `public-market-data` paths: `/api/market/references`
  (catalog), `/api/market/references/{ticker}` (detail with `window` and the
  `live` overlay), `/references/{ticker}/treasury`, `/references/{ticker}/filings`
  (SEC Form 4), `/references/{ticker}/positioning` (CFTC Commitments of Traders),
  `/api/market/treasuries/{coin}`, `/api/market/large-trades` and
  `/api/market/liquidations`. Their errors are typed as `PublicMessageError`
  (`{ message }`). Coverage, freshness and attribution stay per source: an
  empty tape or zero total is not proof of no activity, and liquidation
  `capturedPct` is capture uptime, not exchange completeness.
- Adds the agent operations the API already served: `/api/agent/universe`,
  `/api/agent/universe/sectors`, `/api/agent/spot/reference/{coinId}` and the
  house-agent `pm_paper_v2` lifecycle (`/api/agent/pm/v2/discover`,
  `/positions`, `/open`, `/open/replay`, `/close`). PM v2 opens from an API key
  require `forecastProbability` (a decimal string); a missing forecast returns
  422 `forecast_required` and a forecast that does not beat the fee-inclusive
  cost returns 422 `entry_forecast_not_above_cost`.
- Types newly documented optional parameters: `minUsd` on `/whales`; `view`,
  `lead`, `dedupe`, `minVolume24h` and `includeQuoteEvidence` on `/events`;
  `view`, `full`, `lang` and `includeQuoteEvidence` on event detail;
  `outcomeExternalMarketId` on the order book; `view` and
  `maxEndDateDifferenceDays` on `/matches/public`; candle range `1Y`.
- Types fields the API already returned: whale wallet, trader and event fields
  and `stats24h`; event `availability` (paused venue), `quoteEvidence` and
  `outcomesTotal`; event detail `detailMode` and `liteFallback`; order-book
  `receivedAt` and `sideEvidence`; calibration `methodologyVersion`,
  `finalPrice` and `ownCapture`; wallet `enrichment`; `/api/agent/me` `usage`;
  top gainers/losers price freshness.
- Corrections that can require typed-caller changes: whale `outcome` is
  `string | null`; portfolio `pnl.allTimeUsd`/`allTimePct` can be `null`;
  `/events` pagination exposes `hasMore` and marks the never-sent `total`
  deprecated; `AgentLedgerExport.futures`/`futuresEvents` and
  `PmOpportunityResponse.thesis` were never returned and are deprecated.

## 0.3.5 (published 2026-10-07)

- Types optional market-context `priceTiming`, `funding`, `derivatives`,
  `macro` and `defi` blocks, including open interest, positioning, captured
  liquidations, observed book depth, associated-chain TVL and stablecoin supply.
  Coverage and freshness belong to each block: depth covers one venue's
  observed 20-level book, macro quotes are derivative proxies, and a chain
  association does not identify a coin as its native token.
- Adds optional `derivatives.fundingByVenue` with independently collected
  settlement-reference and Hyperliquid context rates. `rateFraction` is a raw
  fraction per interval; `hourlyEquivalentFraction` is simple division by
  `intervalHours`, not APR or a return forecast. Unknown intervals/times remain
  null, `sourceAt` is null and `sameTime` is false. The existing top-level
  funding reference and futures-entry rules are unchanged.
- Types optional PM discovery/position `relatedCoins` and position
  `eventEndDate`. Missing metadata stays unknown; linked coins are not a
  correlation model and implausible venue dates are not usable horizons.
- Regenerated from API contract 1.7.0. New fields are additive and optional;
  unavailable values remain null. The TypeScript runtime wrapper and runtime
  dependencies are unchanged from the published 0.3.4 release.

## 0.3.4

Published on npm and verified on 2026-10-02.

- Adds optional `representativeOutcome` (a full `PublicPmOutcome`, or `null`)
  and `representativeOutcomeBasis` (`threshold_ladder_line` or
  `informative_leader`) to prediction-market events. Both are served on open
  events only: on event detail, and on compact lists requested with
  `lead=representative`. `informative_leader` is not necessarily the leading
  outcome.
- Adds canonical-question `consensus` (the current cross-venue reference:
  kind, outcomeName, probability, venueCount, spreadPoints, computedAt,
  methodologyVersion and listings, or `null`) and `consensusHistory` (a daily
  tape in which every point carries its own outcome label). `listings` may be a
  subset of the contributing venues.
- Types the optional per-outcome `hasObservedPrice` flag and nullable
  `sourceObservation` provenance.
- Adds types for public resolved/surprise/expiring events, order books and
  trades, event subtitles, price basis and per-outcome settlement rules.
- Adds optional futures-entry eligibility, spot quote `priceTiming`, fill
  `orderId` and replay evidence. Timing is informational; source snapshot
  time is neither a last-trade timestamp nor a per-fill receipt.
- Corrects price-history types to describe one outcome's `points` and a
  lookback interval; corrects nullable spot replay fields. These corrections
  describe existing wire behavior and may require changes in typed callers.
- Generated from API contract 1.7.0. Most fields are optional additions. The
  basis and consensus kind are strict enums, so a future value needs a
  matching SDK release. These notes include changes after the frozen
  September 28 draft; that draft is not the complete current release.

## 0.3.3

- Adds the optional `minEntryProbabilityPct` request field to PM quote and open:
  a chosen-side entry probability floor in percentage points before fees. It is
  omitted by default; `0` is a valid explicit value. Generated from the
  unchanged API contract 1.7.0; the runtime wrapper is unchanged. See the
  repository's [release status](https://github.com/CoinRithm/coinrithm-agent-trading#version-clarity)
  for registry availability.

## 0.3.2

- Adds the typed Arena `status: "open"` view for server-marked house-agent
  handles. Open decisions are `pending`; `openedAt` is available while Brier,
  realized settlement, and realized PnL evidence remain nullable/zero as
  documented. The feed preserves optional thesis and advisory fields and the
  public whale-wallet summary/detail endpoints.
- Adds typed optional per-outcome `venueTerms` for venue-published minimum size,
  tick, fee, early-close, and settlement-timer facts. Unavailable values remain
  explicit `null`; valid `false` and `0` values are preserved.
- Type optional candle `vm`: null means unknown coverage, zero means no known
  missing expected venue, and a positive count identifies partial volume.
- Correct generated cancellation types and documentation for the existing
  `200` / optional `alreadyClosed` response and `500` server failures.
  Covered by offline HTTP contract tests. See the repository's
  [release status](https://github.com/CoinRithm/coinrithm-agent-trading#version-clarity)
  for registry availability.

## 0.3.1 - 2026-09-15

Published on npm; the registry archive and fresh installation were verified on
2026-09-15. See the
[combined release notes](https://github.com/CoinRithm/coinrithm-agent-trading/releases/tag/mcp-trading-v0.7.9).

- Adds offline HTTP contract tests and 90% coverage gates for every runtime
  coverage metric. Runtime source remains a small wrapper around `openapi-fetch`;
  generated type declarations have no executable coverage denominator.

- Ships corrected generated documentation for candle `v`: a mean rolling
  24-hour USD quote-volume observation, not volume traded within the candle.
  Do not sum bars or difference successive values as interval turnover.
- Updates the development-only YAML parser dependency. Runtime dependencies
  and API contract 1.7.0 remain unchanged.
- Clarifies that outcome display labels can be enriched by the API; preserve
  source/event/outcome identity rather than grouping contracts by name.

## 0.3.0 - 2026-09-07

- Added typed `ArenaContract` metadata for ranking, presentation, capital,
  evidence, and public-identity policy.
- Added Arena `rankScore`, response contract metadata, and the `today`, `24h`,
  and `3m` leaderboard windows.
- Documented the prediction-market search query's normalization, truncation,
  and literal wildcard behavior in generated endpoint types.
- Included Node.js types in package validation so the published README example
  is compiled with the SDK.

## 0.2.0 - 2026-08-19

- Published the generated TypeScript client for CoinRithm's OpenAPI 1.7.0
  paper-trading and public prediction-market surface.
