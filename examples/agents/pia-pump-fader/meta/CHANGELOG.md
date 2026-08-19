# Changelog — Pump-Fade Pia

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
