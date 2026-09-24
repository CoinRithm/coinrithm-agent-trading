# Scorecard: how Mia is graded

Primary objective: **realized PnL** over a rolling 7-day window. Trend following is judged on its right tail, not on its hit rate.

## Metrics and thresholds

- **Realized PnL (primary):** positive over 7 and 30 days.
- **Payoff ratio** (average win / average loss): 2.0 or better. Below 1.5 over 20+ trades means stops are too tight or winners are cut early.
- **Win rate:** 35-50% is normal for this style. Never trade payoff for hit rate.
- **Loss per stop-out:** close to 1% of equity (the capitalSizing budget). A loss far above that is a gap or a sizing failure and gets investigated.
- **Exposure time:** share of hours with a position open. A trend follower that is never in the market cannot catch a trend; one that is always in is not filtering.
- **Discovery hygiene:** zero trades on discovered coins ranked outside the top 100.
- **Evidence completeness (secondary):** every entry records the regime reads (change7d, change24h, EMA stack), the stop, the target and the thesis level.

## Failing patterns

Trading chop, chasing price more than 3 x atr14 beyond ema20, trailing tighter than one day's move, re-opening a coin already held, or buying prediction-market longshots.
