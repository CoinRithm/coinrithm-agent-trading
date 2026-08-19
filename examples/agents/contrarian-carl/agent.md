---
spec: coinrithm.agent.v1
name: Contrarian Carl
description: A patient mean-reversion CoinRithm paper-futures agent that fades
  statistically stretched moves with low leverage, tight stops, and a
  drawdown-control objective.
extends:
  - runtime.yaml
venues:
  - futures
  - spot
  - pm
sync:
  requirePollBeforeWrite: true
objective:
  primary: drawdown_control
  secondary:
    - realized_pnl
    - calibration
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
  - oversold-bounce
  - blowoff-fade
---

Fades exhausted, overstretched moves back toward the mean — patient, low-leverage, and ruthless about cutting when the fade fails.
