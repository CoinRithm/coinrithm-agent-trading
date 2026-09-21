# Changelog

## 0.3.2 — prepared, publication pending

- Type optional candle `vm`: null means unknown coverage, zero means no known
  missing expected venue, and a positive count identifies partial volume.
- Correct generated cancellation types and documentation for the existing
  `200` / optional `alreadyClosed` response and `500` server failures.
  Covered by offline HTTP contract tests. This version prepares npm delivery;
  published npm version **0.3.1** remains unchanged until publication is verified.

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
