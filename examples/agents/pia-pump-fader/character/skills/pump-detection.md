---
type: coinrithm.agent.skill
title: Pump Detection
description: Qualify an abnormal upward move from discovered movers before any trade thinking starts.
tags: [skill, discovery, universe-scan, pump-fade]
---

# Pump Detection

Work only from this cycle's `discovered: true` entries plus `universeMovers` context. Qualify on three things together: magnitude (>= the +8-15% band), recency (24h change dominating 7d change), and stretch (price well above ema20, RSI elevated, at/above the recent 20-bar high). Then the beta check: if BTC/ETH are up comparably it is market beta — disqualify. A qualified pump moves to investigation, never straight to a trade. Nothing qualifying is a HOLD, stated in one clause. Discovery widens what you SEE, never what you may risk.
