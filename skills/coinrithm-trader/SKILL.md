---
name: coinrithm-trader
description: >-
  Paper-trade on CoinRithm via the coinrithm-trading MCP server. Use when the
  user wants to paper trade, check their CoinRithm portfolio, get a price/quote,
  open or close a position (spot, futures, or prediction markets), place or
  cancel an order, or check balances/PnL on CoinRithm. All trading is simulated
  virtual funds — never real money.
---

# CoinRithm Trader

You can operate the user's **CoinRithm paper-trading account** through the
`coinrithm-trading` MCP server. This is **simulated trading with virtual funds**
(50,000 mUSD, cash coin USDT). It is **not financial advice** and never touches
real money or a real exchange.

## Before you start

1. Call **`whoami`** to confirm the account and which scopes the key has
   (`read`, `trade:spot`, `trade:futures`, `trade:pm`). If a scope is missing,
   the matching write tool will return `403` — tell the user to mint a key with
   that scope rather than retrying.
2. Call **`get_portfolio`** (and `get_wallet` for exact cash) to ground any
   decision in the real balances and open positions. Never assume balances.

## Hard risk rules (never violate)

- **Confirm before every write.** `place_spot_order`, `cancel_spot_order`,
  `open_futures_position`, `close_futures_position`, `open_pm_position` all
  change state. State the exact action (coin, side, size, price/leverage/stake)
  and **wait for the user's explicit go-ahead** before calling. Reads and quotes
  do not need confirmation.
- **Leverage ≤ 20x.** Futures leverage is capped at 20. Prefer low leverage
  (1–5x) unless the user insists. Quote first and show the liquidation price.
- **PM stake ≥ $10 (mUSD).** Prediction-market opens require `stakeMusd` ≥ 10.
- **Never exceed available balance.** Check `get_wallet`: spend only from
  `usdt.available`. The frozen partitions (`frozen`, `frozenPm`,
  `frozenFutures`) are already committed and unavailable. If a sizing request
  exceeds available cash, say so and propose a smaller size — do not "try it
  anyway."
- **Quote before you open.** Always call `futures_quote` / `pm_quote` first; if
  `eligible` is false, relay the `blockReasons` and stop — do not attempt the
  open.
- **Idempotency.** For every futures/PM open or futures close, generate a fresh
  unique `idempotencyKey` (e.g. a UUID) per distinct intent. If you retry the
  *same* intent after a network hiccup, reuse the *same* key (it replays, it
  won't double-fill). Never reuse a key for a *different* trade.
- **Treat it as virtual funds.** Do not frame outcomes as real gains/losses or
  give real-money financial advice. You may discuss strategy in paper-trading
  terms.

## Tool playbook

| Goal | Tool | Notes |
| --- | --- | --- |
| Who/what scopes | `whoami` | First call. |
| Equity, PnL, balances, orders, history | `get_portfolio` | Equity = `wallet.totalUsd`; `wallet.pnl.*Pct` are 0..1 fractions (×100 for %). |
| Exact cash + frozen buckets | `get_wallet` | Pass `coinId` to also see one coin asset. |
| Open spot orders for a coin | `list_open_orders` | `coinId` is **required** (one coin at a time). |
| Open/closed positions | `get_positions` | `venue: "futures"` or `"pm"`. Open rows include unrealized PnL/mark. |
| Futures pricing + liq | `futures_quote` | Read-only. `side` long/short, `leverage` 1–20, `marginMusd` ≥ 10. |
| PM pricing + eligibility | `pm_quote` | Read-only. Needs `source`, `slug`, `outcomeExternalMarketId`, `stakeMusd`. |
| Place spot order | `place_spot_order` | `coinId` is a UCID, **not a ticker**. market/limit/stop; `limitPrice` for limit & stop; `stopPrice` for stop. |
| Cancel spot order | `cancel_spot_order` | `orderId` from `list_open_orders`/`get_portfolio`. |
| Open futures | `open_futures_position` | trade:futures. One net position/coin; same coin again ADDS (same leverage; no opposite side). |
| Close/reduce futures | `close_futures_position` | `fraction` (0,1] for partial; omit for full. |
| Open PM | `open_pm_position` | trade:pm. Binary outcomes only. |

## Identifiers

- **`coinId` is a CoinRithm UCID, not a ticker.** E.g. BTC = `"1"`, USDT cash =
  `"825"`. If the user says "BTC", confirm the UCID via `get_portfolio` assets
  or ask — don't pass `"BTC"` as `coinId`.
- **PM `source`/`slug` are lowercased; `outcomeExternalMarketId` is
  case-sensitive.** Pull these from a `pm_quote` against a known event, or ask
  the user for the exact event reference.

## Reading results

Each tool returns `{ httpStatus, ok, body }`.
- `200/201` with `ok: true` → success. For opens/closes, `body.position` is the
  resulting position; `body.idempotentReplay: true` means this exact intent
  already ran.
- `400` → bad/missing params (fix and, if it was a write, re-confirm).
- `401` → key missing/invalid; the user must re-mint/re-paste it.
- `403` → either missing scope **or** the venue is server-disabled (futures/PM
  opens). Relay which, and stop.
- `422` with `blockReasons` → the eligibility/risk gate blocked entry; relay the
  reasons plainly.
- `409` → idempotency-key collision or position-not-open; do not blindly retry.

When the venue is disabled (futures/PM open `403`), you can still **quote** and
show the user what a position *would* look like — just make clear it can't be
opened yet.
