---
type: coinrithm.agent.changelog
title: Contrarian Carl - Changelog
description: Human-readable release notes for the Contrarian Carl house agent.
tags: [agent, changelog, house-agent]
---

# Changelog


## 2026-09-02 - conviction-scaled sizing, fundamentals capabilities

- Owner feedback: the house fleet traded stakes too small to matter on a 50,000 mUSD
  paper wallet (median closes $3-$29). Caps retuned: perTradeMarginMusd 900 -> 2000; maxConcurrentPositions 4 -> 4; maxOpenMarginMusd 3600 -> 8000; maxDailyLossMusd 1200 -> 2500; riskPerTradePct 0.5 -> 1.5; kellyFraction 0.15 -> 0.3; maxDrawdownMusd 2500 -> 6000; capabilities + news.
- The drawdown stop scales with the stakes so a normal losing streak no longer parks
  the agent for good (Leo sat disabled on `equity drawdown >= 2500` from 08-27).
- persona.md gains a three-line conviction ladder (A-grade = full per-trade margin,
  B-grade = about half, weaker = skip).
- The yaml files remain the truth for every number above.

## 2026-08-19 - fits the hosted 8,000-char budget

- Trimmed the merged strategy prose from 8,389 to **7,931** so the bundle fits the
  8,000-char hosted budget. Forking it in the Studio previously truncated the
  strategy mid-sentence; six production forks were losing the journal tail,
  including "the stop goes just past the extreme, set before entry", "never
  average down" and "skipping is winning".
- Nothing behavioural was cut. Removed: two navigational pointers that listed
  files the runner already inlines into the same prompt, an authoring note
  addressed to the human forker ("Edit this prose freely - it defines your
  borders", which reads as permission to rewrite its own constraints), and one
  restatement of the exhaustion-sign list that the Decide step spells out in a
  side-tagged form. guards.md, both skills and the journal are byte-identical.
- Verified by two independent adversarial audits against a 71-rule inventory:
  zero rules lost, zero weakened, no new contradictions.

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
functionality pin was bumped to MCP 0.7.6.


## v1.0.0 — initial release

- Seeded Contrarian Carl as a mean-reversion / fade-the-extreme house agent.
- Objective: drawdown_control (secondary: realized_pnl, calibration).
- Paper futures + spot, 4h cadence, 2x max leverage, requireStopLoss enforced.
- Watchlist: BTC, ETH, SOL, LINK (liquid large caps where reversion is cleaner).
- Risk: 0.5% risk per trade, Kelly fraction 0.15, R:R floor 1.5, max 2 concurrent positions, max 3 trades/day.
- Abstention: minConfidence 0.65, skip on weak signal (skip-heavy by design).
- Kill-switch: 2,500 mUSD max drawdown, 3 consecutive model failures.
- Skills: oversold-bounce (capitulation long) and blowoff-fade (euphoria short).
