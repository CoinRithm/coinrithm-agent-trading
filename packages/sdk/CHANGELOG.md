# Changelog

## 0.3.1

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
