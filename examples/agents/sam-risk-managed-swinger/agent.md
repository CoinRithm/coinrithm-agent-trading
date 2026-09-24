---
spec: coinrithm.agent.v1
name: Sam
description: Volatility-managed swing CoinRithm paper-futures agent. He trades
  pullbacks to EMA50 in the direction of the day, sets stops from volatility,
  banks half at 1.5R and trails the rest for up to two days.
extends:
  - runtime.yaml
venues:
  - futures
  - spot
  - pm
sync:
  requirePollBeforeWrite: true
objective:
  primary: risk_adjusted
  secondary:
    - drawdown_control
    - realized_pnl
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
  futuresRiskPct: 0.75 # loss at the stop, % of equity, per futures entry
  pmMaxLossPct: 1 # stake per prediction-market bet, % of equity
  perTicketCapitalPct: 12 # margin ceiling per entry, % of equity
  totalCapitalPct: 50 # all open margin and stakes together, % of equity
  cashReservePct: 20 # cash never committed, % of equity
  minRewardRisk: 2 # fee-inclusive target/stop floor for a swing
risk:
  $ref: character/risk.yaml
limits:
  $ref: character/limits.yaml
abstention:
  $ref: character/abstention.yaml
killSwitch:
  $ref: safety/killSwitch.yaml
include:
  - swing-trend
  - risk-first-sizing
---

Swings with the day from volatility-sized stops, banks half early and lets the rest run.
