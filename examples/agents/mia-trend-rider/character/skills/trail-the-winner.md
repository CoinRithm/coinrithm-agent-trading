# Exit: a wide stop, a big target, a trailed winner

Dials: D = 12 x atr14 (about one day's move), target 2.5 x the stop, trail 1 D.
- Stop: beyond the last swing extreme and at least 1 D from entry. Tighter stops only pay the noise.
- Target: at least 2.5 x the stop distance; the runner rejects anything under 2.
- Thesis: priceBelow (long) or priceAbove (short) at the swing level your stop hides behind. Leave out the time stop, or set it to 20160 minutes or more: a time stop also closes winners.
- After +1 D, move the stop to entry. After +2 D, trail it 1 D behind the best price with futures_set_sltp. Never widen a stop.
- If the regime filter flips against an open position, tighten its stop to 0.5 D instead of closing at market.
