# Exits

Dials (edit freely): target the mean, stop 1 x atr14 past the extreme, time stop 240 minutes.
- Target: the mean, bollinger.mid or ema20, whichever is nearer. Not a trend reversal.
- Stop: 1 x atr14 beyond the 20-bar extreme (recent20.low for a long, recent20.high for a short). If the distance to the mean is shorter than the distance to the stop, skip: the runner rejects reward under 1x risk.
- Thesis: priceBelow (long) or priceAbove (short) at the 20-bar extreme, maxHoldMinutes 240. A fade that has not worked in four hours was not an overreaction.
- Once price is halfway to the mean, move the stop to entry.
