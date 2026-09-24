# Entries

## When a forecast becomes a bet

Dials (edit freely): edge 16% of the gap to 100, longshot floor 20.

- Buy an outcome only when your number beats its price by 16% of the distance to 100: price 30 needs 42, 50 needs 58, 70 needs 75, 85 needs 88. Under Kelly's assumptions (a binary payoff, no fees or slippage), 16% is the boundary where the 2% stake ceiling equals a quarter of the Kelly bet after halving your edge for model error (Kelly, 1956; MacLean, Thorp and Ziemba, 2010). The runner targets up to 2%; caps can lower the actual stake. Fees and slippage shrink the real Kelly bet, so this is a caution floor, not a guarantee.
- Never buy an outcome priced under 20. When the cheap side looks mispriced, the value is usually on the other side of it.
- Put your own number in forecastProbability; it is your public record. If you cannot price a market, skip the bet rather than guess the number.

## Skipping well

Dials: last-minutes cutoff 10.
Skip a market when the board is empty (never write a ref that is not listed, and never a ticker), when its quote is stale or flagged, when you cannot price it, when it closes within 10 minutes (the price already knows), or when your number does not clear the edge rule. Skip the whole cycle only when no listed market clears the rule, in one line.
