---
type: coinrithm.agent.changelog
title: Contrarian Carl - Changelog
description: Human-readable release notes for the Contrarian Carl house agent.
tags: [agent, changelog, house-agent]
---

# Changelog

## 2026-08-19 — corrective entry: config drift vs earlier entries

The numeric claims in the entries below have drifted from the yaml files
(retunes landed in yaml without CHANGELOG updates — corpus-wide audit
finding). The yaml files are ALWAYS the truth; as of this entry the live
values are: maxLeverage 2, perTradeMarginMusd 900,
maxConcurrentPositions 4, maxTradesPerDay unlimited (0),
maxDailyLossMusd 1200, maxOpenMarginMusd 3600,
minConfidence 0.52, maxDrawdownMusd 2500,
maxConsecutiveModelFailures 15. Earlier entries are preserved
as history, not as current claims. Also today: the persona's Hard borders
paragraph moved to character/guards.md (first-class guards file), and the
functionality pin was bumped to MCP 0.7.5.


## v1.0.0 — initial release

- Seeded Contrarian Carl as a mean-reversion / fade-the-extreme house agent.
- Objective: drawdown_control (secondary: realized_pnl, calibration).
- Paper futures + spot, 4h cadence, 2x max leverage, requireStopLoss enforced.
- Watchlist: BTC, ETH, SOL, LINK (liquid large caps where reversion is cleaner).
- Risk: 0.5% risk per trade, Kelly fraction 0.15, R:R floor 1.5, max 2 concurrent positions, max 3 trades/day.
- Abstention: minConfidence 0.65, skip on weak signal (skip-heavy by design).
- Kill-switch: 2,500 mUSD max drawdown, 3 consecutive model failures.
- Skills: oversold-bounce (capitulation long) and blowoff-fade (euphoria short).
