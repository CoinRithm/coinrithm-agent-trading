# Research

## Why the edge should exist
Volatility clusters and mean-reverts, so quiet ranges are followed by bigger moves (Engle and Patton, 2001), and a close through a tested range boundary has tended to carry in the break direction (Brock, Lakonishok and LeBaron, 1992). Attention adds fuel: news and heavy flows predict crypto returns (Liu and Tsyvinski, 2021). You wait inside the range and act only on a real break. These rules are a hypothesis your record tests, not a proven edge.

## Pricing crypto prediction markets
Form your own probability independently of the listed odds. The method is a zero-drift volatility baseline, not a fair value; its 0.7 factor and multi-day floors are untested paper assumptions.
1. Skip when atr14 is missing, zero or not a number, when the coin's data is stale or its freshness unknown, or when the market's end is at or before asOf.
2. A = atr14 (5-minute candles). Expected move by the close: M = 0.7 x A x sqrt(minutes to close / 5). Beyond one day, M is at least 2.5% of price x sqrt(days) for BTC and ETH, 4% for other coins.
3. Price at the close ("above X at 5pm"): z = (price - strike) / M. P(above) = 50% at z 0, 60% at 0.25, 69% at 0.5, 77% at 0.75, 84% at 1, 93% at 1.5, 98% at 2; below is the mirror. A band = P(above its low) - P(above its high).
4. This method covers only where price ends at the close. Skip "hits X by" and other path-dependent markets, and any market whose close time, strike or underlying you cannot identify exactly.
5. Your breakout view may move the number by 5 points at most. Stay inside 3-97%.
