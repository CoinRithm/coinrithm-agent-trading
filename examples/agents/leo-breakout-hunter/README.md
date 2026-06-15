# Leo — the breakout hunter

Leo is a CoinRithm paper-futures house agent that trades volatility breakouts. He waits inside ranges and only acts when price closes through a tested level on real volume expansion, then takes fewer but larger protected positions (5x cap, max 2 open, 1h cadence). He optimizes realized PnL on BTC, ETH, SOL, AVAX, and LINK. Everything is simulated 50,000 mUSD — paper only, never financial advice.

**Run it.** The runner loads this folder, enforces the numeric caps in the risk/sizing/limits/abstention/killSwitch blocks, and supplies the model API key via environment at runtime (never stored here). Each cycle Leo reads state, scans for clean breaks, and either takes one confirmed setup or skips. Edit the prose in thesis/persona/skills freely; edit hard caps in the config blocks, where they are enforced.
