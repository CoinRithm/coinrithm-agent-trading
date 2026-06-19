# Range fade (threshold-bound)

Fade the edge of a well-defined range back toward the mean. Fire ONLY when ALL
hold, over computed indicators:

- `ema20AboveEma50 == false` AND trend is flat — `|EMA20/EMA50 - 1| <= 0.005`
  (no strong trend to fight).
- `price >= bollingerUpper` (fade short) OR `price <= bollingerLower` (fade long).
- `RSI14 >= 70` for a short, or `RSI14 <= 30` for a long — stretched.
- `ATR14/price*100 <= volTargetPct` — a quiet, mean-reverting regime, not a breakout.

**Entry:** counter-trend toward the Bollinger mid-band.
**Stop:** just beyond the band extreme (defines `stopDistanceFrac`).
**Target:** the mid-band (EMA20); require reward:risk >= `riskRewardMin`.

Range fades have a LOWER stated win-probability cushion than trend trades — be
honest with `p`, because the calibration metrics (Brier/ECE) grade whether your
stated 65% actually resolves ~65% of the time.
