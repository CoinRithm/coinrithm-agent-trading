# Trend pullback (threshold-bound)

Fire ONLY when ALL conditions hold — over **computed indicators**, never eyeballed
candles. Each is a hard threshold so the decision is reproducible and auditable.

- `ema20AboveEma50 == true` — an established uptrend (the trade is with trend).
- `price <= EMA20 * 1.01` — price has pulled back to the fast moving average.
- `40 <= RSI14 <= 55` — momentum cooled but not capitulation-oversold.
- `ATR14/price*100 <= volTargetPct * 1.5` — skip vol blowouts (sizing can't tame them).

**Entry:** long on the reclaim of EMA20.
**Stop:** below the pullback swing low — this defines `stopDistanceFrac` for the
fixed-fractional + Kelly sizing in `character/sizing.yaml`.
**Target:** the prior swing high; the setup must offer reward:risk >= `riskRewardMin` (2.0).

State the win-probability `p` and reward:risk `b` in the decision so the edge gate
(`abstention.minConfidence`) and the fractional-Kelly stake are computed, not guessed.
Name the indicator reads in the rationale so the run-evidence is complete (the
`evidence_coverage` gate).
