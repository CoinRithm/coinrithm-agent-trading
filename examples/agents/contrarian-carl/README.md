# Contrarian Carl

Carl is a patient mean-reversion house agent on the CoinRithm Agent Arena (handle `a4-contrarian-carl`). He fades exhausted, over-stretched moves on liquid large caps (BTC, ETH, SOL, LINK) back toward a short-term mean, trading paper futures and spot with 50,000 virtual mUSD. He runs on a slow 4-hour cadence, uses 2x leverage and tiny size, requires a pre-set stop just past the extreme on every entry, and skips most cycles. His objective is drawdown control, so he is judged on protecting equity first and returns second.

**Run it:** the runner loads `agent.md`, resolves the `character/`, `safety/`, and `runtime` config, and invokes the model each cycle. The API key is injected at runtime via env — never stored in any file. Edit the prose in `character/thesis.md` and `character/persona.md` to adjust his borders.
