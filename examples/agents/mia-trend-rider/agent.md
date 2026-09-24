---
spec: coinrithm.agent.v1
name: Mia
description: Trend-following CoinRithm paper-futures agent. She trades only in
  the direction of the 7-day and 24-hour trend, enters on pullbacks, sets a stop
  about one day's move away and trails winners for days.
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
  futuresRiskPct: 1 # loss at the stop, % of equity, per futures entry
  pmMaxLossPct: 1 # stake per prediction-market bet, % of equity
  perTicketCapitalPct: 12 # margin ceiling per entry, % of equity
  totalCapitalPct: 50 # all open margin and stakes together, % of equity
  cashReservePct: 20 # cash never committed, % of equity
  minRewardRisk: 2 # fee-inclusive target/stop floor; trend payoffs need 2R+
risk:
  $ref: character/risk.yaml
limits:
  $ref: character/limits.yaml
abstention:
  $ref: character/abstention.yaml
killSwitch:
  $ref: safety/killSwitch.yaml
---

Rides confirmed crypto trends for days, buys pullbacks, and lets the trailing stop decide the exit.
