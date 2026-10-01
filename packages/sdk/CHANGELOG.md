# Changelog

## 0.3.4 (current source, not yet published)

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
