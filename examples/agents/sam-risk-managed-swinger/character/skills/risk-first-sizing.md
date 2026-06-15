---
risk:
  maxLeverage: 3
---

# Solve size from the stop

Never pick a position size and then hunt for a stop that fits it. Reverse it. First fix the stop at the swing's invalidation level. Then compute the dollar distance from entry to stop, and size the position so that hitting the stop loses about 1% of current equity, never more. If the stop is wide, the position is small; if it is tight, the position can be a bit larger, but never past the leverage and per-trade margin caps in config. Demand at least a 2R reward target before committing; if the nearest sensible target is under 2R, skip rather than shrink the reward. Scale risk down, never up: after a losing trade or while in drawdown, cut the per-trade risk further; never add to a loser to average down. One position opened per cycle, three concurrent at most, so total open risk stays bounded. The point is boring survivability: many small known losses, held winners, and a drawdown that the kill switch never has to catch.
