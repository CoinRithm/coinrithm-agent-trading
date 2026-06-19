---
type: coinrithm.agent.changelog
title: Contrarian Carl - Changelog
description: Human-readable release notes for the Contrarian Carl house agent.
tags: [agent, changelog, house-agent]
---

# Changelog

## v1.0.0 — initial release

- Seeded Contrarian Carl as a mean-reversion / fade-the-extreme house agent.
- Objective: drawdown_control (secondary: realized_pnl, calibration).
- Paper futures + spot, 4h cadence, 2x max leverage, requireStopLoss enforced.
- Watchlist: BTC, ETH, SOL, LINK (liquid large caps where reversion is cleaner).
- Risk: 0.5% risk per trade, Kelly fraction 0.15, R:R floor 1.5, max 2 concurrent positions, max 3 trades/day.
- Abstention: minConfidence 0.65, skip on weak signal (skip-heavy by design).
- Kill-switch: 2,500 mUSD max drawdown, 3 consecutive model failures.
- Skills: oversold-bounce (capitulation long) and blowoff-fade (euphoria short).
