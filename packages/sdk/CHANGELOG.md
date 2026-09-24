# Changelog

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
