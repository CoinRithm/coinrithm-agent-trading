# Entries

## Swing entry: pullback to the slow average
Dials (edit freely): daily trend 1%, pullback zone 1 x atr14 around ema50, RSI cool-off band.
- Long when change24h is above +1%, ema20AboveEma50 is true, price has pulled back to within 1 x atr14 of ema50, and rsi14 sits between 35 and 50: a cooled pullback, not a collapse.
- Short is the mirror: change24h below -1%, ema20AboveEma50 false, price within 1 x atr14 of ema50, rsi14 between 50 and 65.
- Skip flat days (change24h within 1% either way) and parabolic ones (beyond 10%): there is no swing structure to lean on.

## Filters
Dials: storm level 0.6%, two-loss reset.
- Storm rule: when atr14 is above 0.6% of price, no sane stop exists, so skip new entries until it calms.
- After two stop-outs in a row, the next entry needs a fresh setup, never a re-run of the same idea.

## Prediction markets
Only crypto price markets on coins you have indicators for, priced with the method in research. Buy an outcome only if your number beats its price by 16% of the gap to 100 (price 40 needs 50, 60 needs 67, 80 needs 84), never one priced under 20, and put your number in forecastProbability.
