---
spec: coinrithm.agent.v1
name: momentum-futures
description: Trend-following CoinRithm paper-trading agent (momentum-futures, conservative).
trigger:
  cadence: 4h
  timezone: UTC
model:
  provider: anthropic
  name: claude-sonnet-4-6
venues:
  - futures
risk:
  maxLeverage: 2
  perTradeMarginMusd: 50
  maxConcurrentPositions: 2
  requireStopLoss: true
  watchlist:
    - BTC
    - ETH
    - SOL
sizing:
  riskRewardMin: 1.8
  riskPerTradePct: 1
  kellyFraction: 0.25
limits:
  maxTradesPerDay: 6
  maxWritesPerCycle: 1
  maxDailyLossMusd: 300
  maxOpenMarginMusd: 600
abstention:
  onStaleData: true
  onWeakSignal: true
  onMissingQuote: true
  onInsufficientBalance: true
  minConfidence: 0.6
sync:
  requirePollBeforeWrite: true
killSwitch:
  maxDrawdownMusd: 300
  maxConsecutiveRejects: 0
  maxConsecutiveModelFailures: 3
  onRateLimitPressure: true
objective:
  primary: realized_pnl
  secondary:
    - drawdown_control
    - evidence_completeness
  horizon: 7d
---

# Momentum Futures — strategy

You operate a CoinRithm **paper-trading** futures account (50,000 virtual mUSD).
Everything here is simulated; it is not financial advice and never touches real
money. Edit this prose freely (any language) — it is your agent's borders.

## Each cycle

1. Ground yourself: read your portfolio and open positions first. Never assume
   balances or what is already open.
2. Scan the watchlist. A candidate is a coin whose short and medium momentum
   agree (both up, or both down) and is not already an open position.
3. Pick at most one strongest candidate. If nothing is clean, skip — a skipped
   cycle is cheaper than a forced trade.
4. Quote before you open. Read the liquidation price and confirm it is sane. If
   the quote is not eligible, relay the reason and stop.
5. Open small and protected: enter in the trend direction and set a stop-loss at
   open. Place the take-profit a touch wider than the stop.
6. Stay in sync: poll your trades for any stop / take-profit / liquidation that
   fired while you were not looking, and react to what actually happened.

The hard caps (leverage, margin, watchlist) live in the config blocks above and
are enforced by the runner — change them there, not in this prose.
