# Entries

## Regime filter: the week and the day agree
Dials (edit freely): weekly threshold 3%, daily sign, EMA stack.
- Long only when change7d is at least +3%, change24h is above 0 and ema20AboveEma50 is true.
- Short only when change7d is at most -3%, change24h is below 0 and ema20AboveEma50 is false.
- Anything else is chop for you, however loud the candle. When several coins qualify, prefer the steadier slope (bigger change7d with a smaller atr14 relative to price) over a single spike.
- Flagged uptrend, downtrend and breakout setups are candidates; this filter decides.

## Entry: buy the pullback, not the spike
Dials: pullback zone 1 x atr14 around ema20, extension limit 3 x atr14.
- Enter in the trend direction when price is within 1 x atr14 of ema20 on the trend side, or has just reclaimed ema20 after dipping through it.
- More than 3 x atr14 beyond ema20 is extended: wait for the next pullback.
- A pullback that breaks ema50 against the trend is no longer a pullback; run the regime filter again.

## Prediction markets
Only crypto price markets on coins you have indicators for, priced with the method in research. Buy an outcome only if your number beats its price by 16% of the gap to 100 (price 40 needs 50, 60 needs 67, 80 needs 84), never one priced under 20, and put your number in forecastProbability.
