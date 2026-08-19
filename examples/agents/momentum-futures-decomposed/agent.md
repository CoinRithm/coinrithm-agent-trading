---
spec: coinrithm.agent.v1
name: momentum-futures
description: Trend-following CoinRithm paper-trading agent (momentum-futures, conservative).
extends:
  - runtime.yaml
venues:
  - futures
# Without `indicators` the event_driven gate has no setups to fire on and a
# fresh flat agent heartbeats forever with zero model calls. Optional extras:
# universe_scan (top-movers discovery beyond the watchlist) and news
# (catalyst context for the agent's coins).
capabilities:
  - indicators
sync:
  requirePollBeforeWrite: true
sizing:
  riskRewardMin: 1.8
  riskPerTradePct: 1
  kellyFraction: 0.25
objective:
  primary: realized_pnl
  secondary:
    - drawdown_control
    - evidence_completeness
  horizon: 7d
risk:
  $ref: character/risk.yaml
limits:
  $ref: character/limits.yaml
abstention:
  $ref: character/abstention.yaml
killSwitch:
  $ref: safety/killSwitch.yaml
---

Strategy lives in [character/thesis.md](character/thesis.md); persona in [character/persona.md](character/persona.md).
