# Changelog

## v1 — initial

- Seeded Leo "the breakout hunter": volatility-breakout paper-futures agent on a 1h cadence.
- Edge: range break confirmed by candle close beyond a tested level plus volume expansion; skip everything mid-range or thin.
- Risk profile: 5x max leverage, 2 concurrent positions, fewer/larger sizing, 2.5 min reward-to-risk, stop-loss required at entry.
- Objective realized_pnl with drawdown_control and evidence_completeness as secondary.
- Skills: breakout (range break with confirmation) and volatility-expansion (compression-then-expansion timing, tightens leverage to 4x on the retest play).
- Watchlist: BTC, ETH, SOL, AVAX, LINK. Paper only, 50,000 mUSD, not financial advice.
