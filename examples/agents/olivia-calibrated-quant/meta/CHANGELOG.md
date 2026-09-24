# Changelog

## 2026-09-24 - v2: priced forecasts, Kelly edge rule, no longshots

Evidence, read-only from production on 2026-09-24:
- 09-05 to 09-24: outcomes priced under 20 won 5 of 57 at an average price of 12 and cost 22,843 mUSD. All other buckets together: +588.
- Example forecast: 70% for a 500-dollar BTC band two days out, market 8%; a band that narrow is worth about 10%.
- In the week to 09-24: 24 `pm_ref_unknown` (refs invented on an empty board) and 10 `pm_ref_missing` (event tickers used as refs) out of 68 attempted bets.
- The old skills carried futures rules (R:R 1.3, 2x leverage, stops) for a PM-only agent, and "conviction sizing" could not size: the runner fixes every stake.

Changes:
- probability-forecast: crypto markets priced as digital options from atr14 and time to close, with a multi-day volatility floor; other markets from base rates.
- pm-calibration: buy only when the forecast beats the price by 15% of the gap to 100 (fractional Kelly with the model edge halved); nothing priced under 20 (favorite-longshot bias, Burgi, Deng and Whelan 2025).
- conviction-sizing: concentration control, at most two bets per coin and close date.
- abstention-discipline: empty board means no bet; refs only as listed.
- capitalSizing: futuresRiskPct 0.75 -> 0.5 and minRewardRisk 1.5 -> 1 (both unused, PM only), perTicketCapitalPct 6 -> 4. pmMaxLossPct stays 2.
- risk: perTradeMarginMusd 1500 -> 2000. limits: maxWritesPerCycle 1 -> 2, maxDailyLossMusd 2000 -> 5000.
- killSwitch: maxDrawdownMusd 5000 -> 0 (off), onRateLimitPressure true -> false. The model-failure switch stays at 15.
- sizing.yaml is now notes only; the four inactive abstention flags are gone; MCP pin 0.7.6 -> 0.7.13.
- Merged hosted prose 8,215 -> 5,939 chars.

## 2026-09-02 - conviction-scaled sizing, fundamentals capabilities

- Owner feedback: the house fleet traded stakes too small to matter on a 50,000 mUSD
  paper wallet (median closes $3-$29). Caps retuned: perTradeMarginMusd 600 -> 1500; maxConcurrentPositions 2 -> 3; maxOpenMarginMusd 1200 -> 4500; maxDailyLossMusd 1000 -> 2000; riskPerTradePct 0.5 -> 1.5; kellyFraction 0.2 -> 0.35; maxDrawdownMusd 2500 -> 5000; capabilities + news.
- The drawdown stop scales with the stakes so a normal losing streak no longer parks
  the agent for good (Leo sat disabled on `equity drawdown >= 2500` from 08-27).
- persona.md gains a three-line conviction ladder (A-grade = full per-trade margin,
  B-grade = about half, weaker = skip).
- The yaml files remain the truth for every number above.

## 2026-08-19 - fits the hosted 8,000-char budget

- Trimmed the merged strategy prose from 8,817 to **7,967** so the bundle fits
  the 8,000-char hosted budget. Two production forks were running truncated.
- The first trim was REJECTED by both audits for dropping the abstention
  FREQUENCY prior ("Most cycles you will find no clear edge and stake nothing"),
  keeping only the normative half. For an agent whose thesis is abstention
  discipline, that prior is the only thing telling a small model how OFTEN
  abstention is expected, so losing it biases her toward over-trading. It is
  restored in pm-calibration.md.
- A re-audit then caught that the same pass had also removed the opposite
  counterweight ("you are a calibrated bettor, not a wallflower"), which would
  have left her more abstentionist than the original. That is restored too, so
  the pro-action / pro-abstention balance matches the pre-trim bundle.

## 2026-08-19 — corrective entry: config drift vs earlier entries

The numeric claims in the entries below have drifted from the yaml files
(retunes landed in yaml without CHANGELOG updates — corpus-wide audit
finding). The yaml files are ALWAYS the truth; as of this entry the live
values are: maxLeverage 2, perTradeMarginMusd 600,
maxConcurrentPositions 2, maxTradesPerDay unlimited (0),
maxDailyLossMusd 1000, maxOpenMarginMusd 1200,
minConfidence 0.5, maxDrawdownMusd 2500,
maxConsecutiveModelFailures 15. Earlier entries are preserved
as history, not as current claims. Also today: the persona's Hard borders
paragraph moved to character/guards.md (first-class guards file), and the
functionality pin was bumped to MCP 0.7.6.

## v1.0.0 — initial release

- Created Olivia, the calibration-first house agent for CoinRithm Arena paper futures.
- Objective set to calibration, with drawdown_control and risk_adjusted as secondary.
- Cadence 4h, watchlist BTC/ETH/SOL/LINK, model claude-sonnet-4-6.
- Conservative profile: 2x max leverage, 0.5 percent risk per trade, 250 mUSD per-trade margin, max 2 trades/day, max 2 concurrent positions, stop-loss required at open.
- Abstention gate at minConfidence 0.70 with skip-on-weak-signal enabled.
- Kill switch at 1,200 mUSD drawdown and 3 consecutive model failures.
- Seeded three skills: probability-forecast, conviction-sizing, and abstention-discipline.
