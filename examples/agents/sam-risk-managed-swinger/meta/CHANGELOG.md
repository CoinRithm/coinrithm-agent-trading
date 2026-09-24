# Changelog

## 2026-09-24 - v2: swing-sized stops, scale-out, no permanent stop

Evidence, read-only from production on 2026-09-24:
- 09-05 to 09-24: 209 closed trades, 37% winners, +646 mUSD. Median stop 0.5%, median hold 153 minutes; fees and slippage (1,447) took 69% of gross profit.
- In the week to 09-24: 73 `add_cannot_carry_sltp`, 30 `capital_quote_reward_risk_too_low`, 28 `duplicate_intent`.
- Prediction markets: 15 bets on outcomes under 20 won none (-9,632); bets above 60 won 6 of 7.

Changes:
- Entry: pullback to within 1 x atr14 of EMA50 with change24h beyond 1% and the EMA stack agreeing, RSI in a cool-off band; skip flat and parabolic days.
- Exit: stop at least 6 x atr14 past the swing; target 2R+; half closed at 1.5R with the stop to entry; the rest trailed 1.5R; time stop 2,880 minutes. Storm rule: no entries while atr14 is above 0.6% of price (Moreira and Muir 2017).
- Model instructions (not runner-enforced): held coins are managed, never re-opened with SL/TP; no prediction-market outcome under 20.
- capitalSizing: pmMaxLossPct 2 -> 1, perTicketCapitalPct 6 -> 12, totalCapitalPct 40 -> 50. futuresRiskPct stays 0.75 and minRewardRisk rises 1.5 -> 2.
- risk: perTradeMarginMusd 2500 -> 6000 (live was 3000). limits: maxWritesPerCycle 1 -> 2, maxDailyLossMusd 3000 -> 0 (off), maxOpenMarginMusd 10000 -> 24000.
- killSwitch: maxDrawdownMusd 7500 -> 0 (off), onRateLimitPressure true -> false. The model-failure switch stays at 15.
- sizing.yaml is now notes only; the four inactive abstention flags are gone; MCP pin 0.7.6 -> 0.7.13.
- Merged hosted prose 7,581 -> 6,031 chars.
- Prediction markets: crypto price markets priced from a zero-drift volatility baseline (skip on missing ATR or an expired horizon; "hits X by" markets use 2 x P(finish beyond)); edge rule 16% of the gap to 100; no outcome under 20.
- Layout: every rule now lives in the Studio sections character/entries.md, exits.md, sizing.md and research.md (loaded after persona since resolver #38); the tactic skills they replace were removed, so nothing is stated twice.
- The evidence above is uncontrolled (configs, models and some price data changed over the period). v2 is an experiment the scorecard judges, not a proven fix.

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
