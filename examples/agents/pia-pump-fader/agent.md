---
spec: coinrithm.agent.v1
name: Pump-Fade Pia
description: A selective pump-fade CoinRithm paper agent that discovers abnormal
  upward moves with universe_scan, investigates the cause with news, waits for
  exhaustion, and only then paper-shorts the confirmed reversal. HOLD is her
  default action.
extends:
  - runtime.yaml
venues:
  - futures
  - pm
sync:
  requirePollBeforeWrite: true
objective:
  primary: risk_adjusted
  secondary:
    - drawdown_control
    - calibration
  horizon: 7d
# The capability trio is Pia's whole design (the first bundle to wire anything
# beyond indicators):
#   - universe_scan: her candidates COME from discovery — each cycle the top
#     24h movers beyond the watchlist are promoted into tradable watch entries
#     marked `discovered: true`, with further movers as symbol + 24h context
#     in observation.universeMovers.
#   - news: catalyst investigation for the discovered pump (State 2 of her
#     thesis) — discovered movers are included in the news query.
#   - indicators: exhaustion evidence AND the event-driven trigger that wakes
#     her at all.
capabilities:
  - indicators
  - universe_scan
  - news
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
  - pump-detection
  - fade-entry
---

Strategy in [character/thesis.md](character/thesis.md); temperament in [character/persona.md](character/persona.md); hard borders in [character/guards.md](character/guards.md); tactics under [character/skills/](character/skills).
