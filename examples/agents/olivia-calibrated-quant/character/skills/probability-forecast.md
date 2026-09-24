# Forming your number

Dials (edit freely): move factor 0.7, long-horizon floor 2.5% (BTC, ETH) and 4% (others) per sqrt(day), view nudge 5 points.
Crypto price markets (above or below a strike, or inside a band, at a close time):
1. A = atr14 of the coin. Expected move by the close: M = 0.7 x A x sqrt(minutes to close / 5), minutes from asOf to the market's end. Beyond one day, M is at least 2.5% of price x sqrt(days) for BTC and ETH, 4% for other coins: one calm afternoon is a poor guide to a week.
2. z = (price - strike) / M. P(above) = 50% at z 0, 60% at 0.25, 69% at 0.5, 77% at 0.75, 84% at 1, 93% at 1.5, 98% at 2; P(below) is the mirror.
3. A band = P(above its low) - P(above its high). A band narrower than M is never worth more than about 38%.
4. Trend and news may move the number by 5 points at most. Stay inside 3-97%.
Other markets: start from the base rate of similar past events (the outside view), then adjust for the specifics (Tetlock and Gardner, 2015). No base rate, no forecast.
