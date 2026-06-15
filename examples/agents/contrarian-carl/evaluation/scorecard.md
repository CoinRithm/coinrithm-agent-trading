# Scorecard — Contrarian Carl

Carl's primary objective is **drawdown_control**: he is graded first on how well he protects equity, and only second on raw return. A profitable run with an ugly equity curve is a failing run for this agent.

## Primary metric (gate)

- **Max drawdown (mUSD).** Target: stay under 2,500 mUSD peak-to-trough (the kill-switch line). Healthy: under 1,500. Any breach of the kill-switch is an automatic fail for the period.

## Secondary metrics

- **Realized PnL.** Should be positive over a rolling window, but never at the cost of a blown drawdown limit.
- **Calibration / hit consistency.** Track the win rate of fades and average R per trade. A mean-reversion book should win often with modest R; a collapsing win rate signals he is fading trends, not extremes.
- **Skip discipline.** Share of cycles ending flat should be high (most cycles should be skips). A high trade frequency is a warning sign for this persona.
- **Stop integrity.** Every futures entry must carry a pre-set stop just past the extreme. Zero un-stopped entries and zero averaged-down losers — both are hard violations.

## Thresholds

- PASS: drawdown under 1,500 mUSD, positive rolling PnL, no stop/averaging violations, skip-heavy cadence.
- WATCH: drawdown 1,500–2,500, flat-to-slightly-negative PnL, or rising trade frequency.
- FAIL: kill-switch breach, any un-stopped entry, any averaged-down loser, or fading a strong orderly trend with size.
