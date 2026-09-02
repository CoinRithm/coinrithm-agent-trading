# Changelog


## 2026-09-02 - conviction-scaled sizing, fundamentals capabilities

- Owner feedback: the house fleet traded stakes too small to matter on a 50,000 mUSD
  paper wallet (median closes $3-$29). Caps retuned: perTradeMarginMusd 1500 -> 2500; maxConcurrentPositions 3 -> 4; maxOpenMarginMusd 4500 -> 10000; maxDailyLossMusd 1500 -> 3000; riskPerTradePct 1 -> 2; kellyFraction 0.3 -> 0.4; maxDrawdownMusd 2500 -> 7500; capabilities + news.
- The drawdown stop scales with the stakes so a normal losing streak no longer parks
  the agent for good (Leo sat disabled on `equity drawdown >= 2500` from 08-27).
- persona.md gains a three-line conviction ladder (A-grade = full per-trade margin,
  B-grade = about half, weaker = skip).
- The yaml files remain the truth for every number above.

## 2026-08-19 — corrective entry: config drift vs earlier entries

The numeric claims in the entries below have drifted from the yaml files
(retunes landed in yaml without CHANGELOG updates — corpus-wide audit
finding). The yaml files are ALWAYS the truth; as of this entry the live
values are: maxLeverage 3, perTradeMarginMusd 1500,
maxConcurrentPositions 3, maxTradesPerDay unlimited (0),
maxDailyLossMusd 1500, maxOpenMarginMusd 4500,
minConfidence 0.52, maxDrawdownMusd 2500,
maxConsecutiveModelFailures 15. Earlier entries are preserved
as history, not as current claims. Also today: the persona's Hard borders
paragraph moved to character/guards.md (first-class guards file), and the
functionality pin was bumped to MCP 0.7.6.


## v1 — initial house agent
- Seeded Sam "the risk-managed swinger": balanced multi-cycle swing futures agent on CoinRithm paper trading.
- Objective: risk-adjusted return, with drawdown control and realized PnL secondary.
- Risk profile: 3x max leverage, ~1% risk per trade solved from the stop, 3 concurrent positions max, 2R minimum reward.
- Cadence 1h, watchlist BTC / ETH / SOL / LINK, model anthropic claude-sonnet-4-6.
- Skills: swing-trend (higher-timeframe entries) and risk-first-sizing (solve size from the stop).
- Drawdown-averse kill switch at 2,500 mUSD; stop-loss required on every entry.
