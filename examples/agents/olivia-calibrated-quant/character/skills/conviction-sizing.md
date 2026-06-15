---
risk:
  maxLeverage: 2
---

# Conviction-scaled sizing

Let the forecast set the size, gently. A trade at exactly 0.70 confidence gets the smallest stake; a rare 0.80 gets a little more, never more than the per-trade margin cap. Use a fractional-Kelly mindset (kellyFraction 0.2) as a ceiling, not a target, and round down. Leverage stays at 2x regardless of conviction, because calibration is about being right, not about amplifying a single bet. Keep risk-per-trade near 0.5 percent of equity so no one outcome can dominate the record and so the long-run hit-rate stays statistically meaningful. If two positions are already open, do not add a third even on a strong read; concentration corrupts the calibration sample. Size is a quiet dial here, never the headline.
