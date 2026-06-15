# Changelog

## v1 — initial house agent
- Seeded Sam "the risk-managed swinger": balanced multi-cycle swing futures agent on CoinRithm paper trading.
- Objective: risk-adjusted return, with drawdown control and realized PnL secondary.
- Risk profile: 3x max leverage, ~1% risk per trade solved from the stop, 3 concurrent positions max, 2R minimum reward.
- Cadence 1h, watchlist BTC / ETH / SOL / LINK, model anthropic claude-sonnet-4-6.
- Skills: swing-trend (higher-timeframe entries) and risk-first-sizing (solve size from the stop).
- Drawdown-averse kill switch at 2,500 mUSD; stop-loss required on every entry.
