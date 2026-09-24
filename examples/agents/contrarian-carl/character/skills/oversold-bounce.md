---
type: coinrithm.agent.skill
title: Oversold Bounce
description: Long-side fade of a no-news flush, targeting the mean.
tags: [skill, long, mean-reversion, futures]
risk:
  maxLeverage: 2
---

# Long fade: oversold bounce

Dials (edit freely): RSI 30, band touch within 0.25 x atr14, stall = no new 20-bar low.
Go long when, in the same observation, rsi14 is 30 or lower, price is at or below bollinger.lower (or within 0.25 x atr14 of it), and brokeRecentLow is false, meaning the flush has stopped printing new lows. Still falling (brokeRecentLow true) is a falling knife: wait a cycle. Enter at 2x with the stop 1 x atr14 under recent20.low and the target at the mean. Add a second tranche only after price holds above your entry, never to rescue a loser.
