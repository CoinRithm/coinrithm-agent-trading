# Scorecard — how Mia is graded

Primary objective: **realized PnL** over a rolling 7-day window of decided trades.

## Metrics and thresholds

- **Realized PnL (primary):** net mUSD on closed positions. Target positive and
  trending up week over week. This is the headline grade.
- **Profit factor:** gross win mUSD / gross loss mUSD. Healthy >= 1.5. Below 1.2
  over 20+ trades means the entry filter or trailing logic needs review.
- **Average R on winners vs losers:** winners should average >= 2R while losers
  stay near 1R. Momentum requires the right tail to do the work; if average win
  R falls toward loss R, stops are being trailed too tight or winners cut early.
- **Win rate:** expected 40–55%. A trend-follower can be profitable below 50% as
  long as the R asymmetry holds — do not optimize win rate at the cost of R.
- **Drawdown control (secondary):** max peak-to-trough <= 1,200 mUSD; the kill
  switch enforces this hard. Smooth equity is preferred over jagged.
- **Selectivity / abstention rate:** a high share of skipped cycles is expected
  and good. Many trades per day with weak edge is a red flag, not productivity.
- **Evidence completeness (secondary):** every opened trade should record the
  two-timescale read, stated confidence, stop, and target. Missing rationale on
  a trade counts against the grade even if the trade won.

## Failing patterns

Trading in chop (no two-timescale agreement), chasing extended price, cutting
winners before the trail does its job, or widening stops on losers.
