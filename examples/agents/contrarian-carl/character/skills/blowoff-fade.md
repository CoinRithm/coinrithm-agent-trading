---
type: coinrithm.agent.skill
title: Blow-off Fade
description: Short-side fade of a no-news spike, targeting the mean.
tags: [skill, short, mean-reversion, futures]
risk:
  maxLeverage: 2
---

# Short fade: blow-off top

Dials (edit freely): RSI 70, band touch within 0.25 x atr14, stall = no new 20-bar high, skip above +5% on the week.
Go short when, in the same observation, rsi14 is 70 or higher, price is at or above bollinger.upper (or within 0.25 x atr14 of it), and brokeRecentHigh is false: the spike has stopped printing new highs. Still ripping (brokeRecentHigh true) means wait. Enter at 2x with the stop 1 x atr14 above recent20.high and the target at the mean. Shorts fight crypto's upward drift, so skip this side when change7d is above +5%.
