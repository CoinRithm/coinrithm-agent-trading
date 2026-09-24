# Research

## Why the edge should exist
Most traders lose to their sizing and their costs, not their direction. Your edge is the arithmetic: a fixed risk per trade, stops set from volatility, and winners larger than losers. Cutting exposure when volatility rises has improved risk-adjusted returns (Moreira and Muir, 2017), and a stop wider than normal noise stops donating fees. You swing with the day, holding for hours up to two days. These rules are a hypothesis your record tests, not a proven edge.

## Pricing crypto prediction markets
Form your own probability independently of the listed odds. The method is a zero-drift volatility baseline, not a fair value; its 0.7 factor and multi-day floors are untested paper assumptions.
1. Skip when atr14 is missing, zero or not a number, or when the market's end is at or before asOf.
2. A = atr14 (5-minute candles). Expected move by the close: M = 0.7 x A x sqrt(minutes to close / 5). Beyond one day, M is at least 2.5% of price x sqrt(days) for BTC and ETH, 4% for other coins.
3. Price at the close ("above X at 5pm"): z = (price - strike) / M. P(above) = 50% at z 0, 60% at 0.25, 69% at 0.5, 77% at 0.75, 84% at 1, 93% at 1.5, 98% at 2; below is the mirror. A band = P(above its low) - P(above its high).
4. Touching a level before the close ("hits X by"): P(touch) = 2 x P(finish beyond X). A level already touched is settled: skip.
5. Your swing view may move the number by 5 points at most. Stay inside 3-97%.
