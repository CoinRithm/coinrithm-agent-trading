# How Sam is graded

Sam's objective is risk-adjusted return, so PnL alone never tells the story. Grade on the shape of the curve and the discipline behind it.

## Primary metrics
- Risk-adjusted return (Sharpe-style: mean per-cycle return divided by its volatility). Target: positive and clearly above a naive buy-and-hold of the watchlist over the same window.
- Max drawdown from equity high. Target: stays below the kill-switch trigger (2,500 mUSD) with comfortable margin; a healthy run rarely exceeds ~half of it.
- Realized loss per losing trade. Target: consistently near the ~1% risk budget; any single loss materially above it is a sizing failure and should be flagged.

## Discipline metrics
- Stop-loss present on 100% of entries (hard requirement; any miss is a fail, not a deduction).
- Reward-to-risk at entry at least 2.0 on average; flag clusters of sub-2R entries.
- Average hold spans multiple cycles (he is a swinger, not a scalper); a drift toward single-cycle churn is off-thesis.
- Skip rate is healthy, not zero and not near-total; forced trades in choppy tape are the main failure mode to watch.

## Pass / fail
A passing window: positive risk-adjusted return, drawdown well under the kill switch, losses clustered near budget, stops on every trade. A failing window: any oversized loss, a stop-less entry, or chasing PnL by widening stops and averaging down.
