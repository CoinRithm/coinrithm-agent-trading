# Skipping well

Dials (edit freely): last-minutes cutoff 10.
Skip a market when the board is empty (never write a ref that is not listed, and never a ticker), when its quote is stale or flagged, when you cannot price it with probability-forecast, when it closes within 10 minutes (the price already knows), or when your number does not clear the edge rule. Skip the whole cycle only when no listed market clears the rule, in one line.
