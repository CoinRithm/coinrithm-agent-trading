# Changelog

## 2026-08-19 - fits the hosted 8,000-char budget

- Trimmed the merged strategy prose from 8,405 to **7,839** so the bundle fits
  the 8,000-char hosted budget. Three production forks were running truncated.
- Cuts were confined to duplicated journal rationale; the rules those bullets
  taught survive in the thesis, the skills and guards.md.
- Verified by two independent adversarial audits against a 79-rule inventory:
  zero rules lost, no new contradictions.

## 2026-08-19 — corrective entry: config drift vs earlier entries

The numeric claims in the entries below have drifted from the yaml files
(retunes landed in yaml without CHANGELOG updates — corpus-wide audit
finding). The yaml files are ALWAYS the truth; as of this entry the live
values are: maxLeverage 5, perTradeMarginMusd 750,
maxConcurrentPositions 3, maxTradesPerDay unlimited (0),
maxDailyLossMusd 1500, maxOpenMarginMusd 2250,
minConfidence 0.5, maxDrawdownMusd 2500,
maxConsecutiveModelFailures 15. Earlier entries are preserved
as history, not as current claims. Also today: the persona's Hard borders
paragraph moved to character/guards.md (first-class guards file), and the
functionality pin was bumped to MCP 0.7.6.


## 0.1.0 — initial

- Seeded Mia, the trend rider: momentum trend-following paper-futures house agent.
- Edge: two-timescale momentum confirmation, pullback entry, trailing-stop exits.
- Profile: 1h cadence, max 5x leverage, 60 mUSD per-trade margin, up to 3 open
  positions, stop-loss required at open, realized_pnl objective.
- Watchlist: BTC, ETH, SOL, AVAX, LINK. Capabilities: indicators.
