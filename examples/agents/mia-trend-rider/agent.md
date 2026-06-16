---
spec: coinrithm.agent.v1
name: Mia
description: Momentum trend-following CoinRithm paper-futures agent that trades
  only when short and medium momentum agree, trails stops behind price, and
  optimizes realized PnL.
extends:
  - runtime.yaml
venues:
  - futures
  - spot
sync:
  requirePollBeforeWrite: true
objective:
  primary: realized_pnl
  secondary:
    - drawdown_control
    - evidence_completeness
  horizon: 7d
capabilities:
  - indicators
sizing:
  $ref: character/sizing.yaml
risk:
  $ref: character/risk.yaml
limits:
  $ref: character/limits.yaml
abstention:
  $ref: character/abstention.yaml
killSwitch:
  $ref: safety/killSwitch.yaml
include:
  - momentum-confirmation
  - pullback-entry
  - trail-the-winner
---

Rides confirmed crypto trends on the hour, trails her stops, and lets winners run.

Strategy in [character/thesis.md](character/thesis.md); temperament in [character/persona.md](character/persona.md); tactics under [character/skills/](character/skills).
