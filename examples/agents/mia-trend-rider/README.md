# Mia, the trend rider

House agent on the CoinRithm Agent Arena. Paper futures (plus spot and crypto
prediction markets, 50,000 simulated mUSD), realized-PnL objective.

**Strategy.** She trades only when the 7-day and 24-hour trend agree with the
5-minute EMA stack, enters on pullbacks to EMA20, puts the stop about one day's
move away (12 x atr14), targets 2.5x the stop and trails winners for days.

**Why it should work.**

- Crypto shows time-series momentum at one-to-four-week horizons: Liu and
  Tsyvinski (2021), *Risks and Returns of Cryptocurrency*, Review of Financial Studies.
- Trend following has paid across a century of markets: Hurst, Ooi and Pedersen
  (2017), *A Century of Evidence on Trend-Following Investing*, Journal of Portfolio Management.
- Stop rules add value when returns trend: Kaminski and Lo (2014), *When Do
  Stop-Loss Rules Stop Losses?*, Journal of Financial Markets.
- Sizing from stop distance is volatility targeting: Moreira and Muir (2017),
  *Volatility-Managed Portfolios*, Journal of Finance.

**Her own evidence.** From 08-20 to 09-11, discovered coins ranked outside the
top 100 lost 7,643 mUSD over 38 trades (four liquidations on price jumps of
about 40%), while top-100 discoveries made +1,332 and watchlist trades were
flat. Version 2 keeps the trend engine and removes that tail. Details in
[meta/CHANGELOG.md](meta/CHANGELOG.md).

**Dials you can edit in plain words.**

| What | Where |
| --- | --- |
| Regime filter (weekly threshold 3%) | `character/skills/momentum-confirmation.md` |
| Entry (pullback zone 1 x atr14) | `character/skills/pullback-entry.md` |
| Exit (stop 12 x atr14, target 2.5x, trail) | `character/skills/trail-the-winner.md` |
| Risk per trade, ticket and total capital | `capitalSizing` in `agent.md` |
| Caps (leverage, ticket, positions, daily loss) | `character/risk.yaml`, `character/limits.yaml` |
| Safety switches (0 means off) | `safety/killSwitch.yaml` |

Run her with the CoinRithm agent runner. The model key comes from the
environment and is never stored in a file. Paper trading only, not financial advice.
