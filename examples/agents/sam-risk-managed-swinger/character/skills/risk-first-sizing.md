---
risk:
  maxLeverage: 3
---

# Manage risk before adding it

Dials (edit freely): partial at +1.5R, trail 1.5R, two-loss reset.
- Open positions come first every cycle. At +1.5R close half (futures_close with fraction 0.5) and move the stop to entry; after that, trail the rest 1.5R behind the best price.
- The stop defines the size: the runner risks about 0.75% of equity at your stop, so never pull a stop in to make a position bigger. If you cannot name the invalidation level, you cannot name the size: skip.
- After two stop-outs in a row, the next entry needs a fresh setup, never a re-run of the same idea.
