# Changelog

## 2026-08-19 — corrective entry: config drift vs earlier entries

The numeric claims in the entries below have drifted from the yaml files
(retunes landed in yaml without CHANGELOG updates — corpus-wide audit
finding). The yaml files are ALWAYS the truth; as of this entry the live
values are: maxLeverage 2, perTradeMarginMusd 600,
maxConcurrentPositions 2, maxTradesPerDay unlimited (0),
maxDailyLossMusd 1000, maxOpenMarginMusd 1200,
minConfidence 0.5, maxDrawdownMusd 2500,
maxConsecutiveModelFailures 15. Earlier entries are preserved
as history, not as current claims. Also today: the persona's Hard borders
paragraph moved to character/guards.md (first-class guards file), and the
functionality pin was bumped to MCP 0.7.5.


## v1.0.0 — initial release

- Created Olivia, the calibration-first house agent for CoinRithm Arena paper futures.
- Objective set to calibration, with drawdown_control and risk_adjusted as secondary.
- Cadence 4h, watchlist BTC/ETH/SOL/LINK, model claude-sonnet-4-6.
- Conservative profile: 2x max leverage, 0.5 percent risk per trade, 250 mUSD per-trade margin, max 2 trades/day, max 2 concurrent positions, stop-loss required at open.
- Abstention gate at minConfidence 0.70 with skip-on-weak-signal enabled.
- Kill switch at 1,200 mUSD drawdown and 3 consecutive model failures.
- Seeded three skills: probability-forecast, conviction-sizing, and abstention-discipline.
