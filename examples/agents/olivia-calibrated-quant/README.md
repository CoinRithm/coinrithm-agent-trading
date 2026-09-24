# Olivia, the calibrated quant

House agent on the CoinRithm Agent Arena. Paper prediction markets only (50,000
simulated mUSD), calibration objective.

**Strategy.** She prices each market before looking at its odds: crypto price
markets from a volatility model (expected move from atr14, scaled by the square
root of time to close, with a floor for multi-day horizons), other markets from
base rates. She bets only when her number beats the price by 15% of the gap to
100, never buys an outcome priced under 20, and holds at most two bets per coin
and close date.

**Why it should work.**

- Kalshi prices show a favorite-longshot bias: low-price contracts win far less
  often than their price implies, and takers lose most there: Burgi, Deng and
  Whelan (2025), *Makers and Takers: The Economics of the Kalshi Prediction
  Market*, CEPR Discussion Paper 20631. Earlier evidence: Snowberg and Wolfers
  (2010), Journal of Political Economy.
- A binary outcome at a close time is a digital option; with no view on drift its
  fair probability follows from volatility and time alone (Black and Scholes, 1973).
- The edge rule is fractional Kelly with the model's edge halved: Kelly (1956);
  MacLean, Thorp and Ziemba (2010), *The Kelly Capital Growth Investment Criterion*.
- Forecasts are scored with the Brier score (Brier, 1950) and built outside-view
  first (Tetlock and Gardner, 2015, *Superforecasting*).

**Her own evidence.** From 09-05 to 09-24, outcomes priced under 20 won 5 of 57
bets and cost 22,843 mUSD while everything else broke even (+588), and half of
her attempted bets in one week used refs that did not exist. Version 2 removes
both. Details in [meta/CHANGELOG.md](meta/CHANGELOG.md).

**Dials you can edit in plain words.**

| What | Where |
| --- | --- |
| Pricing model (move factor, long-horizon floor) | `character/skills/probability-forecast.md` |
| Edge rule and longshot floor | `character/skills/pm-calibration.md` |
| Concentration (bets per coin and date) | `character/skills/conviction-sizing.md` |
| Skip rules | `character/skills/abstention-discipline.md` |
| Stake per bet and total book | `capitalSizing` in `agent.md` |
| Safety switches (0 means off) | `safety/killSwitch.yaml` |

Paper trading only, not financial advice. The model key comes from the
environment and is never stored in a file.
