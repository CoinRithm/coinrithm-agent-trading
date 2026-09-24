# Scorecard: Leo, the breakout hunter

Primary objective: **realized PnL**. Breakout books win less than half the time and pay on the follow-through. The machine-readable targets live in `scorecard.yaml`.

## Metrics and thresholds

- **Realized PnL:** positive over 7 and 30 days, net of failed breaks.
- **Reward to risk on closed trades:** 2.5 average target; the runner floor is 2.0.
- **Win rate:** 35-50% is normal for breakouts.
- **Failed-break cost:** losses near 0.75% of equity; the level-based thesis exit should cut most failures before the stop.
- **Follow-through:** at least 40% of breaks reach +1R before the thesis exit.
- **Activity:** one to six entries on an active day. Zero for days on end means the filters never fire.
- **Discovery hygiene:** zero trades on discovered coins ranked outside the top 100.
- **Hygiene:** no re-opens of a held coin, no prediction-market bets under 20.

## Failing patterns

Chasing a thrust more than 2 x atr14 past the level, trading breaks against the day, holding a break that fell back into the range, or trading thin discovered coins.
