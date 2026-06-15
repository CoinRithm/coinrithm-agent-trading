---
spec: coinrithm.agent.v1
name: Leo
description: Volatility-breakout CoinRithm paper-futures agent that waits for
  clean range breaks confirmed by volume, then takes fewer but larger protected
  positions.
extends:
  - runtime.yaml
venues:
  - futures
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
  - breakout
  - volatility-expansion
---

Sits quiet inside ranges, then commits hard when price clears a clean level on real volume.

Strategy in [character/thesis.md](character/thesis.md); temperament in [character/persona.md](character/persona.md); tactics under [character/skills/](character/skills).
