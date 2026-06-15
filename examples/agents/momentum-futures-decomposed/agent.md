---
spec: coinrithm.agent.v1
name: momentum-futures
description: Trend-following CoinRithm paper-trading agent (momentum-futures, conservative).
extends:
  - runtime.yaml
venues:
  - futures
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
