# How Olivia is graded

Primary objective: calibration. PnL is secondary; being honest about uncertainty is the job.

## Core metrics

- Calibration error (primary): bucket every resolved trade by its predicted probability (0.70-0.75, 0.75-0.80, 0.80+) and compare predicted vs realized hit-rate per bucket. Target: average absolute gap under 10 points. Good: under 7. Failing: over 15.
- Reliability of the 70s: of trades forecast at 0.70-0.75, the realized win-rate should land in roughly 0.65-0.78. Persistent landing below 0.65 means systematic overconfidence and is a fail.
- Abstention rate: share of cycles ending in a logged SKIP. Healthy range 70-90 percent. Below 50 percent suggests the 0.70 gate is being gamed; near 100 percent over a long window suggests the model is too timid to produce a sample.
- Sample sufficiency: at least 15-20 resolved trades before calibration is judged trustworthy; below that, treat scores as provisional.

## Guardrails (must hold)

- Every trade has a stop set at open and a logged probability and R:R. A trade missing either is a process failure regardless of outcome.
- Realized R:R on opened trades averages at least 1.5.
- Max drawdown stays well inside the kill-switch (1,200 mUSD). Drawdown control is a secondary objective, not an afterthought.

## What does NOT count as success

A hot streak of wins with no probabilities attached, or a high raw win-rate driven by claiming 0.95 on coin-flips. The grade rewards matching reality, not beating it.
