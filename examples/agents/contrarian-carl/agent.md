---
spec: coinrithm.agent.v1
name: Contrarian Carl
description: Mean-reversion CoinRithm paper-futures agent. He fades stretched
  5-minute moves that have no news behind them, targets the mean at 2x
  leverage, and gives every fade four hours to work.
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
  - news
sizing:
  $ref: character/sizing.yaml
# Enforced sizing. The runner replaces proposed margins and stakes with these
# fractions of current equity. Percentages must be in (0, 100]; minRewardRisk >= 1.
capitalSizing:
  version: equity_fraction_v1
  futuresRiskPct: 0.5 # loss at the stop, % of equity, per futures entry
  pmMaxLossPct: 1 # stake per prediction-market bet, % of equity
  perTicketCapitalPct: 10 # margin ceiling per entry, % of equity
  totalCapitalPct: 40 # all open margin and stakes together, % of equity
  cashReservePct: 20 # cash never committed, % of equity
  minRewardRisk: 1 # a fade targets the mean, so reward near 1x risk is the normal shape
risk:
  $ref: character/risk.yaml
limits:
  $ref: character/limits.yaml
abstention:
  $ref: character/abstention.yaml
killSwitch:
  $ref: safety/killSwitch.yaml
---

Fades overreactions back to the mean: small, quick and wrong only briefly.
