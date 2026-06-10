#!/usr/bin/env python3
"""CoinRithm momentum bot (Python) -- a complete, runnable futures-agent template.

The Python twin of examples/bots/momentum-bot.mjs, built on the zero-dependency
client in coinrithm.py (standard library only).

What it does:
  1. whoami                  -- confirm the key + scopes
  2. resolve(SYMBOL)         -- symbol -> coinId (UCID)
  3. market(coinId)          -- 1h/24h momentum signal (long/short/none)
  4. futures_quote(...)      -- entry price, liquidation price, eligibility
  5. Confirm gate            -- DEFAULT IS A DRY RUN: prints the exact plan and
                                exits. Set LIVE=1 to actually open.
  6. open_futures(...)       -- with stop-loss + take-profit set at open
  7. Poll trades(updated_since=cursor) -- persisted cursor in a .state.json
     next to this file; dedupe by (venue, id); back off on 429 (the client
     honors Retry-After)
  8. Report when the stop-loss / take-profit / liquidation fires.

How to run:
  COINRITHM_API_KEY=crk_live_xxx python3 examples/python/momentum_bot.py

Env (all optional except the key):
  LIVE=1         actually place the trade. Default: DRY RUN -- trades NOTHING.
  SYMBOL         default BTC
  LEVERAGE       default 2 (max 20)
  MARGIN_MUSD    default 50 (min 10)
  SL_PCT/TP_PCT  stop/target distance from entry, default 2 / 4 (%)
  POLL_SECONDS   default 60       MAX_POLLS  default 120 (then exits; the
                 cursor is persisted, so re-running RESUMES the watch)

What it costs: nothing. PAPER trading -- a 50,000 virtual-mUSD account.
No real money, no real exchange, not financial advice.
"""

import json
import os
import pathlib
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from coinrithm import CoinRithm  # noqa: E402

LIVE = os.environ.get("LIVE") == "1"
SYMBOL = os.environ.get("SYMBOL", "BTC")
LEVERAGE = min(float(os.environ.get("LEVERAGE", 2)), 20)
MARGIN = max(float(os.environ.get("MARGIN_MUSD", 50)), 10)
SL_PCT = float(os.environ.get("SL_PCT", 2)) / 100
TP_PCT = float(os.environ.get("TP_PCT", 4)) / 100
POLL_SECONDS = int(os.environ.get("POLL_SECONDS", 60))
MAX_POLLS = int(os.environ.get("MAX_POLLS", 120))

STATE_FILE = pathlib.Path(__file__).parent / ".momentum_bot.state.json"


def load_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text())
    except (OSError, ValueError):
        return {"cursor": None, "seen": [], "position": None}


def save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2))


def watch_position(crk: CoinRithm, state: dict) -> None:
    """Delta-poll /trades with the persisted asOf cursor until our position
    closes (stop_loss / take_profit / liquidation / user_close)."""
    pos = state["position"]
    print(f"\nWatching position {pos['id']} ({pos['side']} {pos['symbol']}) -- "
          f"SL={pos.get('stopLossPrice')} TP={pos.get('takeProfitPrice')}")
    for i in range(MAX_POLLS):
        if state["cursor"]:
            j = crk.trades(venue="futures", updated_since=state["cursor"])
        else:
            j = crk.trades(venue="futures", limit=1)
        state["cursor"] = j["asOf"]  # ALWAYS advance the cursor from the response
        fresh = [t for t in j.get("trades", []) if f"{t['venue']}:{t['id']}" not in state["seen"]]
        state["seen"] = (state["seen"] + [f"{t['venue']}:{t['id']}" for t in fresh])[-200:]
        save_state(state)

        if fresh:
            mine = next((p for p in crk.futures_positions().get("positions", []) if p["id"] == pos["id"]), None)
            if mine and mine["status"] != "open":
                pnl = mine.get("realizedPnlMusd") or 0
                print(f"\nPosition {pos['id']} closed: exitReason={mine.get('exitReason')} "
                      f"exit={mine.get('exitPrice')} realizedPnl={pnl:+.2f} mUSD")
                state["position"] = None
                save_state(state)
                return
            print(f"  poll {i + 1}: {len(fresh)} new closed trade(s), ours still open")
        else:
            print(f"  poll {i + 1}: no new fills (cursor={state['cursor']})")
        time.sleep(POLL_SECONDS)
    print(f"\nReached MAX_POLLS={MAX_POLLS}. Cursor + position persisted -- re-run to resume.")


def main() -> None:
    key = os.environ.get("COINRITHM_API_KEY") or os.environ.get("CRK_API_KEY")
    if not key:
        sys.exit("Set COINRITHM_API_KEY (CoinRithm -> Profile -> API Keys).")
    crk = CoinRithm(api_key=key, base_url=os.environ.get("BASE_URL", "https://api.coinrithm.com"))

    mode = "LIVE (paper trades WILL be placed)" if LIVE else "DRY RUN (plan only -- set LIVE=1 to trade)"
    print(f"\n=== CoinRithm momentum bot (Python) -- {mode} ===")
    print("Paper trading only: virtual mUSD, no real money.\n")

    state = load_state()
    if state.get("position"):
        print(f"Resuming: state file has open position {state['position']['id']}.")
        watch_position(crk, state)
        return

    # 1) Identity + scopes
    me = crk.whoami()
    scopes = set(me.get("scopes", []))
    print(f"1) whoami: user {me['userId']}, scopes {sorted(scopes)}")
    if LIVE and "trade:futures" not in scopes:
        sys.exit("LIVE=1 needs a key with trade:futures scope.")

    # 2) Resolve the symbol to a coinId (UCID)
    match = crk.resolve(SYMBOL).get("match")
    if not match:
        sys.exit(f'could not resolve "{SYMBOL}" to a coin')
    coin_id = match["coinId"]
    print(f"2) resolve: {SYMBOL} -> coinId {coin_id} ({match['name']})")

    # 3) Momentum signal (a TEACHING heuristic, not alpha)
    m = crk.market(coin_id)
    price = m.get("price") or {}
    c1, c24 = price.get("change1h") or 0, price.get("change24h") or 0
    print(f"3) market: ${price.get('usd')} | 1h {c1}% 24h {c24}%")
    side = "long" if (c1 > 0 and c24 > 1) else "short" if (c1 < 0 and c24 < -1) else None
    if not side:
        print("   No signal (1h and 24h momentum must agree, |24h| > 1%). Exiting.")
        return
    print(f"   Signal: {side.upper()}")

    # 4) Quote first (read-only)
    q = crk.futures_quote(coin_id, side, leverage=LEVERAGE, margin_musd=MARGIN)
    if not q.get("eligible"):
        print(f"4) quote: entry BLOCKED -- {q.get('blockReasons')}. Exiting.")
        return
    entry, liq = q["entryPrice"], q["liquidationPrice"]
    print(f"4) quote: entry~{entry} liq~{liq} notional={q.get('notionalMusd')} mUSD")

    # 5) Side-aware SL/TP corridor (long: liq < SL < entry < TP; short inverted)
    if side == "long":
        sl = max(entry * (1 - SL_PCT), liq + (entry - liq) * 0.1)
        tp = entry * (1 + TP_PCT)
    else:
        sl = min(entry * (1 + SL_PCT), liq - (liq - entry) * 0.1)
        tp = entry * (1 - TP_PCT)
    sl, tp = round(sl, 6), round(tp, 6)

    plan = {"coinId": coin_id, "symbol": match["symbol"], "side": side, "leverage": LEVERAGE,
            "marginMusd": MARGIN, "entryPrice": entry, "stopLossPrice": sl,
            "takeProfitPrice": tp, "liquidationPrice": liq}
    print(f"5) plan:\n{json.dumps(plan, indent=2)}")

    if not LIVE:
        t = crk.trades(venue="futures", limit=1)
        state["cursor"] = t["asOf"]
        save_state(state)
        print(f"\nDRY RUN -- no order placed. (Captured asOf cursor {t['asOf']} into {STATE_FILE.name}.)")
        print("Set LIVE=1 to open this position with the SL/TP above (paper funds only).")
        return

    # 6) Open WITH SL/TP set atomically (idempotency key: unique per intent)
    res = crk.open_futures(coin_id, side, leverage=LEVERAGE, margin_musd=MARGIN,
                           idempotency_key=CoinRithm.new_idempotency_key("momentum"),
                           stop_loss_price=sl, take_profit_price=tp)
    pos = res["position"]
    print(f"6) opened position {pos['id']}: {pos['side']} {pos['sizeCoin']} {match['symbol']} "
          f"@ {pos['entryPrice']} (SL {pos['stopLossPrice']}, TP {pos['takeProfitPrice']})")

    # 7) Capture a fresh cursor, persist, and watch for the SL/TP to fire
    t = crk.trades(venue="futures", limit=1)
    state["cursor"] = t["asOf"]
    state["position"] = {"id": pos["id"], "side": side, "symbol": match["symbol"],
                         "stopLossPrice": pos.get("stopLossPrice"), "takeProfitPrice": pos.get("takeProfitPrice")}
    save_state(state)
    watch_position(crk, state)


if __name__ == "__main__":
    main()
