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
universe:
  $ref: character/universe.yaml
sizing:
  $ref: character/sizing.yaml
# Enforced sizing. The runner replaces proposed margins and stakes with these
# fractions of current equity. Percentages must be in (0, 100]; minRewardRisk >= 1.
capitalSizing:
  version: equity_fraction_v1
  futuresRiskPct: 1 # loss at the stop, % of equity, per futures entry
  pmMaxLossPct: 1 # stake per prediction-market bet, % of equity
  perTicketCapitalPct: 12 # margin ceiling per entry, % of equity
  totalCapitalPct: 70 # all open margin and stakes together, % of equity
  cashReservePct: 20 # cash never committed, % of equity
  minRewardRisk: 2 # fee-inclusive target/stop floor; trend payoffs need 2R+
  highConviction: # owner 2026-10-08: a futures entry rated >= 0.85 may go big; blowing the book is accepted (balance reset exists)
    minConfidence: 0.85
    perTicketCapitalPct: 50 # margin ceiling for that entry, % of equity (25,000 of 50,000)
    futuresRiskPct: 5 # loss at the stop for that entry, % of equity
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
