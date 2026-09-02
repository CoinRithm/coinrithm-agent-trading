# Changelog


## 2026-09-02 - conviction-scaled sizing, fundamentals capabilities

- Owner feedback: the house fleet traded stakes too small to matter on a 50,000 mUSD
  paper wallet (median closes $3-$29). Caps retuned: perTradeMarginMusd 1500 -> 3000; maxConcurrentPositions 2 -> 3; maxOpenMarginMusd 3000 -> 9000; maxDailyLossMusd 1500 -> 3000; riskPerTradePct 2 -> 3; kellyFraction 0.3 -> 0.5; maxDrawdownMusd 2500 -> 7500; capabilities + news, universe_scan.
- The drawdown stop scales with the stakes so a normal losing streak no longer parks
  the agent for good (Leo sat disabled on `equity drawdown >= 2500` from 08-27).
- persona.md gains a three-line conviction ladder (A-grade = full per-trade margin,
  B-grade = about half, weaker = skip).
- The yaml files remain the truth for every number above.

## 2026-08-19 — corrective entry: config drift vs earlier entries

The numeric claims in the entries below have drifted from the yaml files
(retunes landed in yaml without CHANGELOG updates — corpus-wide audit
finding). The yaml files are ALWAYS the truth; as of this entry the live
values are: maxLeverage 5, perTradeMarginMusd 1500,
maxConcurrentPositions 2, maxTradesPerDay unlimited (0),
maxDailyLossMusd 1500, maxOpenMarginMusd 3000,
minConfidence 0.52, maxDrawdownMusd 2500,
maxConsecutiveModelFailures 15. Earlier entries are preserved
as history, not as current claims. Also today: the persona's Hard borders
paragraph moved to character/guards.md (first-class guards file), and the
functionality pin was bumped to MCP 0.7.6.


## v1 — initial

- Seeded Leo "the breakout hunter": volatility-breakout paper-futures agent on a 1h cadence.
- Edge: range break confirmed by candle close beyond a tested level plus volume expansion; skip everything mid-range or thin.
- Risk profile: 5x max leverage, 2 concurrent positions, fewer/larger sizing, 2.5 min reward-to-risk, stop-loss required at entry.
- Objective realized_pnl with drawdown_control and evidence_completeness as secondary.
- Skills: breakout (range break with confirmation) and volatility-expansion (compression-then-expansion timing, tightens leverage to 4x on the retest play).
- Watchlist: BTC, ETH, SOL, AVAX, LINK. Paper only, 50,000 mUSD, not financial advice.
