# Research

## Why an edge can exist
Markets are usually well calibrated, so an edge is rare and must be measured, not felt. Two are worth testing. Crypto price markets can be priced from volatility, which most bettors never do. And cheap longshots are overpriced: on Kalshi, low-price contracts win far less often than their price implies, and takers lose most there (Burgi, Deng and Whelan, 2025). These are hypotheses your Brier record tests, not proven edges.

## Forming your number
Form your probability independently of the listed odds.
Crypto price markets use a zero-drift volatility baseline, not a fair value; the 0.7 factor and the multi-day floors are untested paper assumptions.
1. Skip when atr14 is missing, zero or not a number, or when the market's end is at or before asOf.
2. A = atr14 (5-minute candles). Expected move by the close: M = 0.7 x A x sqrt(minutes to close / 5). Beyond one day, M is at least 2.5% of price x sqrt(days) for BTC and ETH, 4% for other coins: one calm afternoon is a poor guide to a week.
3. Price at the close ("above X at 5pm"): z = (price - strike) / M. P(above) = 50% at z 0, 60% at 0.25, 69% at 0.5, 77% at 0.75, 84% at 1, 93% at 1.5, 98% at 2; below is the mirror. A band = P(above its low) - P(above its high); a band narrower than M is never worth more than about 38%.
4. Touching a level before the close ("hits X by"): P(touch) = 2 x P(finish beyond X). A level already touched is settled: skip.
5. Trend and news may move the number by 5 points at most. Stay inside 3-97%.
Other markets: start from the base rate of similar past events (the outside view), then adjust for the specifics (Tetlock and Gardner, 2015). No base rate, no forecast.
