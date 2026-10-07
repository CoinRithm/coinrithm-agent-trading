# Changelog — Pump-Fade Pia

## 2026-10-07 - granular, enforced settings

Evidence, read-only from production on 2026-10-07 (Data, temp/agentic-baseline-20261007/BASELINE.md):
- On settled prediction-market decisions every house agent's own probability scored worse than the market price (Brier skill vs market -19% to -91%).
- Numbers written in prose (edge rules, bets per event, last-minutes cutoffs) were never enforced in code; editing them changed nothing.
- The settings below are hypotheses from a historical counterfactual, not a promised improvement: the forward bench measures whether they help.

Changes:
- character/risk.yaml: adds the 20-point PM entry floor the other house agents carry, plus `pmMaxEdgePoints: 20` (overconfidence cap) and `pmMaxOpenPerEvent: 1` (per event, same market slug), now runner-enforced. A minimum-edge rule and a 30-minute cutoff were tested against the same 3,428 settled bets and dropped: the minimum edge kept exactly the overconfident losers (blocked bets +0.8%, kept -25%), the cutoff was mixed.
- character/universe.yaml + `universe: $ref` in agent.md: declared market boundaries replace the generic top-gainers scan.
  Top 500 by market cap, at least $1M 24h volume, no stablecoins or pegged assets, ranked by 24h gainers. BTC/ETH remain watch-only anchors.

## 2026-08-19 — initial release

- First bundle in the corpus to wire capabilities beyond `indicators`:
  `universe_scan` (discovery is the candidate source) + `news` (catalyst
  investigation) + `indicators` (exhaustion evidence + trigger).
- Boundary-configuration reference: BTC/ETH on watchlist AND blocklist
  (regime anchors, never tradable); guard sentences in persona/thesis;
  adherence-first scorecard (a short without a preceding qualifying pump is a
  failed period regardless of PnL).
- Config at release: maxLeverage 2, perTradeMarginMusd 600,
  maxConcurrentPositions 2, maxTradesPerDay 4, maxDailyLossMusd 900,
  maxOpenMarginMusd 1200, minConfidence 0.6, maxDrawdownMusd 2000,
  cadence 10m. (If any of these drift, the yaml files are the truth — update
  this line when retuning.)
- Born from a real user's pump-fade design request (2026-08-18/19); the
  thesis intentionally references only observation data that exists (no
  volume, no intraday series, no derivatives evidence).
