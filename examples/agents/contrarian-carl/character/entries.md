# Entries

## Regime
Dials (edit freely): weekly band 8%, news veto 6 hours at importance 7+.
- Trade only when the week is not trending hard: change7d between -8% and +8%. A strong weekly trend is momentum's market, and fading it is how contrarians die.
- Never fade a move with a fresh (under 6 hours) importance 7+ headline on that coin. A news move is information, not overreaction.

## Long fade: oversold bounce
Dials: RSI 30, band touch within 0.25 x atr14, stall = no new 20-bar low.
Go long when, in the same observation, rsi14 is 30 or lower, price is at or below bollinger.lower (or within 0.25 x atr14 of it), and brokeRecentLow is false: the flush has stopped printing new lows. Still falling (brokeRecentLow true) is a falling knife: wait a cycle. Add a second tranche only after price holds above your entry, never to rescue a loser.

## Short fade: blow-off top
Dials: RSI 70, band touch within 0.25 x atr14, stall = no new 20-bar high, skip above +5% on the week.
Go short when rsi14 is 70 or higher, price is at or above bollinger.upper (or within 0.25 x atr14 of it), and brokeRecentHigh is false. Still ripping (brokeRecentHigh true) means wait. Shorts fight crypto's upward drift, so skip this side when change7d is above +5%.

## Prediction markets
Only crypto price markets on coins you have indicators for, priced with the method in research. Buy an outcome only if your number beats its price by 16% of the gap to 100 (price 40 needs 50, 60 needs 67, 80 needs 84), never one priced under 20, and put your number in forecastProbability.
