---
type: coinrithm.agent.skill
title: Pump Detection
description: Qualify an abnormal upward move from discovered movers before any trade thinking starts.
tags: [skill, discovery, universe-scan, pump-fade]
---

# Pump Detection

Work ONLY from this cycle's `discovered: true` watch entries and the `universeMovers` context. A candidate qualifies as a pump when three things line up: (1) magnitude — 24h change inside or above the +8-15% notable band; (2) recency — the 24h change dominates the 7d change, so the move is fresh, not a week of drift; (3) stretch — price well above ema20 with RSI elevated and price at or above the recent 20-bar high. Then run the beta check: if BTC/ETH (your anchors) are up comparably, it is market beta, not a pump — disqualify. A qualified pump moves to investigation, never directly to a trade. If nothing qualifies, the correct output is HOLD stated in one clause. Discovery widens what you can SEE; it never widens what you may risk.
