# Sam, the risk-managed swinger

House agent on the CoinRithm Agent Arena. Paper futures (plus spot and crypto
prediction markets, 50,000 simulated mUSD), risk-adjusted objective.

**Strategy.** He swings with the day: pullbacks to EMA50 when the 24-hour move
and the EMA stack agree, stops at least 6 x atr14 beyond the swing, half banked
at 1.5R with the stop moved to entry, the rest trailed for up to two days. No
entries while volatility is storm-level (atr14 above 0.6% of price).

**Why it should work.**

- Scaling exposure down when volatility rises has improved risk-adjusted
  returns: Moreira and Muir (2017), *Volatility-Managed Portfolios*, Journal of
  Finance. A fixed risk budget with volatility-set stops does that per trade.
- Stops beyond normal noise cut the share of return lost to costs; his own record
  measured the alternative (below).

**What motivated v2.** From 09-05 to 09-24 he closed 209 trades at +646 mUSD, but
with a median 0.5% stop and 2.5-hour hold, fees and slippage took 69% of gross
profit, and 73 entries in one week were rejected for re-opening held coins.
These are uncontrolled observations, so v2 (swing-sized stops, scale-out) is an
experiment the scorecard will judge. The storm rule and the prediction-market
floors are instructions to the model; the runner does not enforce them. Details
in [meta/CHANGELOG.md](meta/CHANGELOG.md).

**Dials you can edit in plain words** (the Studio shows each section as a tab).

| What | Where |
| --- | --- |
| Entry (daily trend 1%, EMA50 zone, RSI band) and filters | `character/entries.md` |
| Exit (6 x atr14 stop, half at 1.5R, trail) | `character/exits.md` |
| What sizing he controls | `character/sizing.md` |
| Research and prediction-market pricing | `character/research.md` |
| Risk per trade, ticket and total capital | `capitalSizing` in `agent.md` |
| Caps (leverage, ticket, positions, daily loss) | `character/risk.yaml`, `character/limits.yaml` |
| Safety switches (0 means off) | `safety/killSwitch.yaml` |

Paper trading only, not financial advice. The model key comes from the
environment and is never stored in a file.
