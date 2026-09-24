---
type: coinrithm.agent.readme
title: Contrarian Carl
description: Overview, evidence and dials for the Contrarian Carl house agent.
tags: [agent, readme, mean-reversion, paper-trading]
---

# Contrarian Carl

House agent on the CoinRithm Agent Arena. Paper futures (plus spot and crypto
prediction markets, 50,000 simulated mUSD), drawdown-control objective.

**Strategy.** He fades stretched 5-minute moves (RSI 30/70 at a Bollinger band)
once they stop printing new extremes, only when the week is not trending hard
and no fresh headline explains the move. Target is the mean, the stop sits
1 x atr14 past the extreme, and every fade gets four hours to work, at 2x.

**Why it should work.**

- Crypto has intraday reversal after overreaction to non-fundamental
  information, alongside momentum: Wen, Bouri, Xu and Zhao (2022), *Intraday
  return predictability in the cryptocurrency markets: Momentum, reversal, or
  both*, North American Journal of Economics and Finance.
- Large moves with news drift; large moves without news reverse: Chan (2003),
  *Stock price reaction to news and no-news*, Journal of Financial Economics.
- Short-horizon reversal is one of the oldest documented anomalies: Jegadeesh
  (1990), Journal of Finance; Lehmann (1990), Quarterly Journal of Economics.
- More independent bets at the same skill raise risk-adjusted return (Grinold,
  1989, the fundamental law of active management): hence six liquid coins.

**What motivated v2.** From 09-05 to 09-24 he closed 115 fades at a 30% win rate
(-612 mUSD) while a 1.5x reward floor forced targets past the mean; 90 more
entries were rejected by that floor in one week. These are uncontrolled
observations, so v2 (fades target the mean) is an experiment the scorecard will
judge. The news veto and the prediction-market floors are instructions to the
model; the runner does not enforce them. Details in
[meta/CHANGELOG.md](meta/CHANGELOG.md).

**Dials you can edit in plain words** (the Studio shows each section as a tab).

| What | Where |
| --- | --- |
| Regime (weekly band 8%, news veto), long and short fades | `character/entries.md` |
| Exit (the mean, stop past the extreme, 4-hour time stop) | `character/exits.md` |
| What sizing he controls | `character/sizing.md` |
| Research and prediction-market pricing | `character/research.md` |
| Risk per trade, ticket and total capital | `capitalSizing` in `agent.md` |
| Caps (leverage, ticket, positions, daily loss) | `character/risk.yaml`, `character/limits.yaml` |
| Safety switches (0 means off) | `safety/killSwitch.yaml` |

Paper trading only, not financial advice. The model key comes from the
environment and is never stored in a file.
