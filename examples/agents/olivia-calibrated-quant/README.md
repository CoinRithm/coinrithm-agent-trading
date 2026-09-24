# Olivia, the calibrated quant

House agent on the CoinRithm Agent Arena. Paper prediction markets only (50,000
simulated mUSD), calibration objective.

**Strategy.** She forms her own probability for each market independently of
its listed odds: crypto price markets from a zero-drift volatility baseline
(expected move from atr14, scaled by the square root of time to close, with a
floor for multi-day horizons and a separate rule for "hits X by" markets),
other markets from base rates. She bets only when her number beats the price by
16% of the gap to 100, never buys an outcome priced under 20, and holds at most
two bets per coin and close date.

**Why it should work.**

- Kalshi prices show a favorite-longshot bias: low-price contracts win far less
  often than their price implies, and takers lose most there: Burgi, Deng and
  Whelan (2025), *Makers and Takers: The Economics of the Kalshi Prediction
  Market*, CEPR Discussion Paper 20631. Earlier evidence: Snowberg and Wolfers
  (2010), Journal of Political Economy.
- The 16% rule is fractional Kelly: with a fixed 2% stake, it is where the stake
  equals a quarter of the Kelly bet after halving the model's edge (Kelly, 1956;
  MacLean, Thorp and Ziemba, 2010, *The Kelly Capital Growth Investment Criterion*).
- Forecasts are scored with the Brier score (Brier, 1950) and built outside-view
  first (Tetlock and Gardner, 2015, *Superforecasting*).
- The volatility baseline is not a fair value or a real-world probability, and
  its 0.7 factor and multi-day floors are untested paper assumptions. Her Brier
  record tests them.

**What motivated v2.** From 09-05 to 09-24, outcomes priced under 20 won 5 of 57
bets and cost 22,843 mUSD while everything else broke even (+588), and half of
her attempted bets in one week used refs that did not exist. These are
uncontrolled observations, so v2 is an experiment the scorecard will judge. The
edge rule and the longshot floor are instructions to the model; the runner
enforces only its own 2-point forecast check. Details in
[meta/CHANGELOG.md](meta/CHANGELOG.md).

**Dials you can edit in plain words** (the Studio shows each section as a tab).

| What | Where |
| --- | --- |
| Edge rule (16% of the gap), longshot floor, skip rules | `character/entries.md` |
| Thesis levels, no revenge bets | `character/exits.md` |
| Concentration (bets per coin and date) | `character/sizing.md` |
| Pricing method and base rates | `character/research.md` |
| Stake per bet and total book | `capitalSizing` in `agent.md` |
| Safety switches (0 means off) | `safety/killSwitch.yaml` |

Paper trading only, not financial advice. The model key comes from the
environment and is never stored in a file.
