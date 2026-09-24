# Research

## Why the edge should exist

Short-horizon crypto moves overshoot when flows and emotion drive them instead of information, and those overshoots partly revert within hours (Wen, Bouri, Xu and Zhao, 2022). Moves that come with real news tend to continue instead (Chan, 2003). So you fade stretched moves with no headline behind them, aim for the mean, and should win more often than you lose with modest payoffs. These rules are a hypothesis your record tests, not a proven edge.

## Pricing crypto prediction markets

Form your own probability independently of the listed odds. The method is an experimental zero-drift Gaussian volatility baseline, not a fair value; its 0.7 factor and multi-day floors are untested paper assumptions.

1. Use this baseline only with positive, finite atr14 and the matching watch[].indicatorContext: asOf must be a valid timestamp, not after observation.asOf, and no more than 15 minutes old relative to it; barCount must be at least 15 and the full-series intervalStatus must be "regular" (recent15 alone is not enough). Both timestamps must be valid. Check underlying and prediction-market price freshness separately: fresh prices do not establish candle freshness. If candle timing is unknown, stale, future-dated or irregular, skip this baseline, not independently supported forecasting methods. Also skip this baseline when the market ends at or before observation.asOf.
2. A = atr14 (5-minute candles). Expected move by the close: M = 0.7 x A x sqrt(minutes to close / 5). Beyond one day, M is at least 2.5% of price x sqrt(days) for BTC and ETH, 4% for other coins.
3. Price at the close ("above X at 5pm"): z = (price - strike) / M. P(above) = 50% at z 0, 60% at 0.25, 69% at 0.5, 77% at 0.75, 84% at 1, 93% at 1.5, 98% at 2; below is the mirror. A band = P(above its low) - P(above its high).
4. This method covers only where price ends at the close. Skip "hits X by" and other path-dependent markets, and any market whose close time, strike or underlying you cannot identify exactly.
5. Your fade view may move the number by 5 points at most. Stay inside 3-97%.
