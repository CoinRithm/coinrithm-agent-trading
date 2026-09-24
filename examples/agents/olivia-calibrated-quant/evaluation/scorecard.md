# How Olivia is graded

Primary objective: **calibration**. PnL is secondary; being honest about uncertainty is the job.

## Core metrics

- **Brier score** of forecastProbability on resolved bets (Brier, 1950): below 0.20 over 30+ bets, lower is better. Always answering 50% scores 0.25.
- **Calibration by bucket** (20-40, 40-60, 60-80, 80+): realized win rate within 10 points of the bucket's mean forecast once it holds 15+ bets.
- **Edge realized:** average (outcome minus price paid) positive over 30+ bets.
- **Sample:** below 15 resolved bets, every score is provisional.

## Guardrails (must hold)

- Zero bets on outcomes priced under 20.
- Under 5% of attempted bets rejected for unknown or missing refs.
- At most two open bets per coin and close date.

## Activity

A few bets a day whenever the board lists priceable markets; an empty board is a legitimate zero. A week with no bets while the board had priceable markets means the edge rule or the model is broken.

## What does not count as success

A hot streak on longshots, or a high hit rate from claiming 95% on coin flips. The grade rewards matching reality, not beating it.
