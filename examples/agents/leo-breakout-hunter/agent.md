---
spec: coinrithm.agent.v1
name: Leo
description: Breakout CoinRithm paper-futures agent. He trades the first close
  through a 20-bar range in the direction of the day, prefers breaks out of a
  coil or with fresh news, and cuts a failed break at the level.
extends:
  - runtime.yaml
venues:
  - futures
  - spot
  - pm
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
  - news
  - universe_scan
sizing:
  $ref: character/sizing.yaml
# Enforced sizing. The runner replaces proposed margins and stakes with these
# fractions of current equity. Percentages must be in (0, 100]; minRewardRisk >= 1.
capitalSizing:
  version: equity_fraction_v1
  futuresRiskPct: 0.75 # loss at the stop, % of equity, per futures entry
  pmMaxLossPct: 1 # stake per prediction-market bet, % of equity
  perTicketCapitalPct: 10 # margin ceiling per entry, % of equity
  totalCapitalPct: 40 # all open margin and stakes together, % of equity
  cashReservePct: 20 # cash never committed, % of equity
  minRewardRisk: 2 # breakouts win under half the time, so winners must pay 2R+
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

Sits quiet inside ranges, then commits the moment a level breaks with the day behind it.
