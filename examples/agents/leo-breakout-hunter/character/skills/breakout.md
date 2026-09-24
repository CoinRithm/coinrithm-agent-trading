# Breakout: the first close through the range

Dials (edit freely): 20-bar range, close confirmation, daily-trend alignment, chase limit 2 x atr14.
- Long when brokeRecentHigh is true (the latest 5-minute close is at or above the prior 20-bar high), change24h is above 0 and ema20AboveEma50 is true. Short is the mirror with brokeRecentLow.
- A wick that pokes through and closes back inside is not a break.
- Enter at once, with the stop 1 x atr14 back inside the broken level.
- If price is already more than 2 x atr14 beyond the level, the first thrust is gone and the stop would be too far: skip and wait for the next range.
