# Changelog

## 2026-09-24 - v2: evidence-led trend rules, honest sizing, no permanent stop

Evidence, read-only from production on 2026-09-24:
- 08-20 to 09-11: discovered coins ranked outside the top 100 lost 7,643 mUSD over 38 trades, including 4 liquidations (-6,314) when SWEAT and PYR prices jumped about 40% through the stops. Stored hourly prices show SWEAT flipping between two levels (0.000331 and 0.00056), so the "breakouts" were feed flips on thin coins. Top-100 discoveries made +1,332; watchlist trades +74 over 102. The drawdown switch (6,000) then disabled her on 09-11.
- The old "short vs medium momentum" read compared 100-minute and 250-minute EMAs, a noise-level horizon. Crypto momentum lives at one to four weeks (Liu and Tsyvinski 2021).
- The persona's conviction-sizing ladder was dead text: `capitalSizing` replaces proposed margins, and the runner prompt says so.

Changes:
- Regime: change7d (3% dial) + change24h + EMA stack. Entry: within 1 x atr14 of EMA20. Stop: at least 12 x atr14 (about one day's move). Target 2.5R, trail after 1 D.
- Model instruction (not runner-enforced): discovered coins need top-100 rank and 50M of 24h volume. Model instruction: a held coin is managed, never re-opened with SL/TP (the class behind most `add_cannot_carry_sltp` rejects fleet-wide).
- capitalSizing: futuresRiskPct 0.75 -> 1, pmMaxLossPct 2 -> 1, perTicketCapitalPct 6 -> 12, totalCapitalPct 40 -> 50, minRewardRisk 1.5 -> 2.
- risk: maxLeverage 5 -> 4 (matches live), perTradeMarginMusd 2000 -> 6000 (12% of 50,000). limits: maxWritesPerCycle 1 -> 2, maxDailyLossMusd 3000 -> 0 (off), maxOpenMarginMusd 8000 -> 24000.
- killSwitch: maxDrawdownMusd 6000 -> 0 (off), onRateLimitPressure true -> false. The model-failure switch stays at 15.
- Prediction markets: crypto price markets priced from a zero-drift volatility baseline (at-close markets only; skip on missing ATR, stale data, an expired horizon or any path-dependent "hits X by" market); edge rule 16% of the gap to 100; no outcome under 20.
- sizing.yaml is now notes only (the runner never read it); the four inactive abstention flags are gone; MCP pin 0.7.6 -> 0.7.13.
- Merged hosted prose 8,087 -> 6,752 chars.
- Layout: every rule now lives in the Studio sections character/entries.md, exits.md, sizing.md and research.md (loaded after persona since resolver #38); the tactic skills they replace were removed, so nothing is stated twice.
- The evidence above is uncontrolled (configs, models and some price data changed over the period). v2 is an experiment the scorecard judges, not a proven fix.

## 2026-09-02 - conviction-scaled sizing, fundamentals capabilities

- Owner feedback: the house fleet traded stakes too small to matter on a 50,000 mUSD
  paper wallet (median closes $3-$29). Caps retuned: perTradeMarginMusd 750 -> 2000; maxConcurrentPositions 3 -> 4; maxDailyLossMusd 1500 -> 3000; maxOpenMarginMusd 2250 -> 8000; riskPerTradePct 1.5 -> 3; kellyFraction 0.3 -> 0.5; maxDrawdownMusd 2500 -> 6000; capabilities + news, universe_scan.
- The drawdown stop scales with the stakes so a normal losing streak no longer parks
  the agent for good (Leo sat disabled on `equity drawdown >= 2500` from 08-27).
- persona.md gains a three-line conviction ladder (A-grade = full per-trade margin,
  B-grade = about half, weaker = skip).
- The yaml files remain the truth for every number above.

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
