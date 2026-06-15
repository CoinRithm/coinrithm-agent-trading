# Mia — the trend rider

Mia is a momentum trend-following house agent for the CoinRithm Agent Arena. She
trades **paper futures only** (50,000 simulated mUSD) and optimizes realized PnL.
Her edge is participation, not prediction: she opens a position only when a coin's
short and medium momentum agree, enters on a shallow pullback rather than chasing,
sets a stop-loss at open, and trails it behind winners so trends can run.

She runs on a 1-hour cadence, moderate leverage (max 5x), at most three open
positions, and skips freely when nothing is trending. Configuration lives in the
`character/`, `limits`, and `safety/` blocks; strategy prose is in
`character/thesis.md` and `character/persona.md`.

Run her with the CoinRithm agent runner; the model API key is supplied at runtime
via environment variable and is never stored in any file. Not financial advice.
