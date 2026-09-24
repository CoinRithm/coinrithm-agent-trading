# Changelog

## 2026-09-24 - v2: observable breakout rules, discovery floor, no permanent stop

Evidence, read-only from production on 2026-09-24:
- 08-20 to 09-09: 22 trades on discovered coins, all ranked outside the top 100, lost 5,195 mUSD (T, DEGO, AVT, XCN; a 3,000 SWEAT liquidation on a feed flip). They drove the `equity drawdown >= 7500` disable on 09-04. Watchlist trades: -383 over 132.
- Prediction markets: +5,131 over 18 bets at an average price of 37.
- The old rules required "volume on the break above the recent average" and a "retest of the broken level". Neither is observable: the runner exposes only rolling 24h volume and a 20-bar window, so the model had to guess.

Changes:
- Break rule: brokeRecentHigh/Low (a close through the prior 20 bars) with change24h and the EMA stack agreeing; skip if more than 2 x atr14 past the level.
- Quality filter (replaces the retest skill's content): range20 under 5 x atr14 is a coil, over 8 x atr14 is chaos. Evidence: volatility mean reversion (Engle and Patton 2001), range breaks (Brock, Lakonishok and LeBaron 1992).
- Stop 1 x atr14 back inside the level; target 2R+ (prior range height); time stop 1,440 minutes.
- Model instruction (not runner-enforced): discovered coins need top-100 rank and 50M of 24h volume; held coins are managed, never re-opened with SL/TP; no prediction-market outcome under 20.
- capitalSizing: pmMaxLossPct 2 -> 1, perTicketCapitalPct 6 -> 10, minRewardRisk 1.5 -> 2.
- risk: maxLeverage 5 -> 4 (matches live), perTradeMarginMusd 3000 -> 5000. limits: maxWritesPerCycle 1 -> 2, maxDailyLossMusd 3000 -> 0 (off), maxOpenMarginMusd 9000 -> 15000.
- killSwitch: maxDrawdownMusd 7500 -> 0 (off), onRateLimitPressure true -> false. The model-failure switch stays at 15.
- scorecard.yaml: drawdown graded instead of enforced; activity 1-6 entries on an active day; follow-through and discovery-rank metrics.
- sizing.yaml is now notes only; the four inactive abstention flags are gone; MCP pin 0.7.6 -> 0.7.13.
- Merged hosted prose 7,648 -> 6,409 chars.
- Prediction markets: crypto price markets priced from a zero-drift volatility baseline (at-close markets only; skip on missing ATR, stale data, an expired horizon or any path-dependent "hits X by" market); edge rule 16% of the gap to 100; no outcome under 20.
- Layout: every rule now lives in the Studio sections character/entries.md, exits.md, sizing.md and research.md (loaded after persona since resolver #38); the tactic skills they replace were removed, so nothing is stated twice.
- The evidence above is uncontrolled (configs, models and some price data changed over the period). v2 is an experiment the scorecard judges, not a proven fix.

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
