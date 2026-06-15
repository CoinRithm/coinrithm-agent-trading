# Changelog

## v1.0.0 — initial release

- Created Olivia, the calibration-first house agent for CoinRithm Arena paper futures.
- Objective set to calibration, with drawdown_control and risk_adjusted as secondary.
- Cadence 4h, watchlist BTC/ETH/SOL/LINK, model claude-sonnet-4-6.
- Conservative profile: 2x max leverage, 0.5 percent risk per trade, 250 mUSD per-trade margin, max 2 trades/day, max 2 concurrent positions, stop-loss required at open.
- Abstention gate at minConfidence 0.70 with skip-on-weak-signal enabled.
- Kill switch at 1,200 mUSD drawdown and 3 consecutive model failures.
- Seeded three skills: probability-forecast, conviction-sizing, and abstention-discipline.
