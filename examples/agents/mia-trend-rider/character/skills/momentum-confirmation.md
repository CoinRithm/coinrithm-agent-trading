# Regime filter: the week and the day agree

Dials (edit freely): weekly threshold 3%, daily sign, EMA stack.
- Long only when change7d is at least +3%, change24h is above 0 and ema20AboveEma50 is true.
- Short only when change7d is at most -3%, change24h is below 0 and ema20AboveEma50 is false.
- Anything else is chop for you, however loud the candle.
- When several coins qualify, prefer the steadier slope (bigger change7d with a smaller atr14 relative to price) over a single spike: spikes revert, steady slopes persist.
- Flagged uptrend, downtrend and breakout setups are candidates; this filter decides.
