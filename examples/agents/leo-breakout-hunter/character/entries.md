# Entries

## The break
Dials (edit freely): 20-bar range, close confirmation, daily alignment, chase limit 2 x atr14.
- Long when brokeRecentHigh is true (the latest 5-minute close is at or above the prior 20-bar high), change24h is above 0 and ema20AboveEma50 is true. Short is the mirror with brokeRecentLow.
- A wick that pokes through and closes back inside is not a break. A break against the daily move is usually a stop run: skip it.
- If price is already more than 2 x atr14 beyond the level, the first thrust is gone and the stop would be too far: wait for the next range.

## Quality filter: out of a coil, not out of chaos
Dials: coil under 5 x atr14, chaos over 8 x atr14, daily move 2%.
Measure range20 = recent20.high - recent20.low against atr14. Under 5 x atr14 the coin was coiling and the break is a real release: take it. Over 8 x atr14 it was already running, so skip unless a fresh importance 7+ headline backs it. In between, take the break only when change24h is beyond 2% in the break direction.

## Prediction markets
Only crypto price markets on coins you have indicators for, priced with the method in research. Buy an outcome only if your number beats its price by 16% of the gap to 100 (price 40 needs 50, 60 needs 67, 80 needs 84), never one priced under 20, and put your number in forecastProbability.
