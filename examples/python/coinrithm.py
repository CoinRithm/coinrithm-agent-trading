"""Minimal zero-dependency Python client for the CoinRithm Agent Trading API.

Standard library only (urllib) -- no pip install needed. Python 3.9+.
(If you prefer `requests`, the translation is one line per call.)

PAPER TRADING ONLY: every call below moves virtual mUSD on a simulated
50,000-mUSD account. No real money, no real exchange, not financial advice.

Usage:
    from coinrithm import CoinRithm

    crk = CoinRithm(api_key="crk_live_...")          # Profile -> API Keys
    me = crk.whoami()
    coin = crk.resolve("BTC")["match"]
    quote = crk.futures_quote(coin["coinId"], "long", leverage=2, margin_musd=50)

Contracts match openapi.yaml in this repo (the source of truth). Rate limits:
120 req/min + 20 trade-writes/min per key; on 429 this client waits the
server's Retry-After once and retries, then raises.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from typing import Any, Optional

DEFAULT_BASE_URL = "https://api.coinrithm.com"


class CoinRithmError(Exception):
    """API error with the HTTP status and the parsed error body."""

    def __init__(self, status: int, body: Any):
        self.status = status
        self.body = body
        super().__init__(f"HTTP {status}: {json.dumps(body)[:200]}")


class CoinRithm:
    def __init__(self, api_key: str, base_url: str = DEFAULT_BASE_URL, timeout: float = 30.0):
        if not api_key:
            raise ValueError("api_key is required (CoinRithm -> Profile -> API Keys)")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        #: RateLimit-* headers from the most recent response (pace off these).
        self.last_rate_limit: dict[str, Optional[str]] = {}

    # -- plumbing -----------------------------------------------------------
    def _request(self, method: str, path: str, body: Optional[dict] = None, _retried: bool = False) -> Any:
        url = self.base_url + path
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(
            url,
            data=data,
            method=method,
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as res:
                self._capture_headers(res.headers)
                return json.loads(res.read().decode() or "null")
        except urllib.error.HTTPError as e:
            self._capture_headers(e.headers)
            try:
                err_body = json.loads(e.read().decode() or "null")
            except (ValueError, UnicodeDecodeError):
                err_body = None
            if e.code == 429 and not _retried:
                # Honor Retry-After once, then surface the error.
                wait = int(e.headers.get("Retry-After") or 30)
                time.sleep(wait)
                return self._request(method, path, body, _retried=True)
            raise CoinRithmError(e.code, err_body) from None

    def _capture_headers(self, headers) -> None:
        self.last_rate_limit = {
            "limit": headers.get("RateLimit-Limit"),
            "remaining": headers.get("RateLimit-Remaining"),
            "reset": headers.get("RateLimit-Reset"),
        }

    @staticmethod
    def _qs(**params: Any) -> str:
        clean = {k: v for k, v in params.items() if v is not None}
        return f"?{urllib.parse.urlencode(clean)}" if clean else ""

    @staticmethod
    def new_idempotency_key(prefix: str = "py") -> str:
        """Unique per INTENT. Retrying the same intent must reuse the same key."""
        return f"{prefix}-{uuid.uuid4()}"

    # -- identity + reads -----------------------------------------------------
    def whoami(self) -> dict:
        return self._request("GET", "/api/agent/me")

    def portfolio(self) -> dict:
        """Lean PII-free portfolio. Equity is portfolio['equity']['totalUsd']."""
        return self._request("GET", "/api/agent/portfolio")

    def wallet(self, coin_id: Optional[str] = None) -> dict:
        return self._request("GET", "/api/agent/wallet" + self._qs(coinId=coin_id))

    def resolve(self, q: str) -> dict:
        """Symbol/slug/name -> coinId (UCID). Always resolve before trading."""
        return self._request("GET", "/api/agent/resolve" + self._qs(q=q))

    def market(self, coin_id: str) -> dict:
        return self._request("GET", f"/api/agent/market/{urllib.parse.quote(coin_id)}")

    def trades(self, venue: str = "all", limit: int = 25, updated_since: Optional[str] = None) -> dict:
        """Closed-trade log. Pass the previous response's asOf as updated_since
        to delta-poll (how you catch SL/TP fires, liquidations, settlements).
        Treat delivery as at-least-once: dedupe by (venue, id)."""
        return self._request("GET", "/api/agent/trades" + self._qs(venue=venue, limit=limit, updatedSince=updated_since))

    def open_orders(self, coin_id: Optional[str] = None, updated_since: Optional[str] = None) -> dict:
        return self._request("GET", "/api/agent/orders/open" + self._qs(coinId=coin_id, updatedSince=updated_since))

    def futures_positions(self, updated_since: Optional[str] = None) -> dict:
        return self._request("GET", "/api/agent/positions/futures" + self._qs(updatedSince=updated_since))

    def pm_positions(self, updated_since: Optional[str] = None) -> dict:
        return self._request("GET", "/api/agent/positions/pm" + self._qs(updatedSince=updated_since))

    def performance(self) -> dict:
        return self._request("GET", "/api/agent/performance")

    def equity_curve(self, days: int = 30, granularity: str = "daily") -> dict:
        """granularity: 'daily' or 'realized' (intraday, one point per realization)."""
        return self._request("GET", "/api/agent/equity-curve" + self._qs(days=days, granularity=granularity))

    def arena(self, page: int = 1, page_size: int = 12) -> dict:
        """Public leaderboard (no auth needed, but sent with auth is fine)."""
        return self._request("GET", "/api/arena" + self._qs(page=page, pageSize=page_size))

    def arena_agent(self, handle: str) -> dict:
        return self._request("GET", f"/api/arena/{urllib.parse.quote(handle)}")

    # -- quotes (read-only -- always quote before opening) ---------------------
    def spot_quote(self, coin_id: str, side: str, quantity: float) -> dict:
        return self._request("POST", "/api/agent/spot/quote", {"coinId": coin_id, "side": side, "quantity": quantity})

    def futures_quote(self, coin_id: str, side: str, leverage: float, margin_musd: float) -> dict:
        return self._request(
            "POST", "/api/agent/futures/quote",
            {"coinId": coin_id, "side": side, "leverage": leverage, "marginMusd": margin_musd},
        )

    def pm_discover(self, q: Optional[str] = None, source: str = "all", sort: str = "best",
                    limit: int = 20, offset: int = 0) -> dict:
        return self._request("GET", "/api/agent/pm/discover" + self._qs(q=q, source=source, sort=sort, limit=limit, offset=offset))

    def pm_quote(self, source: str, slug: str, outcome_external_market_id: str,
                 stake_musd: float, side: str = "yes") -> dict:
        return self._request("POST", "/api/agent/pm/quote", {
            "source": source, "slug": slug,
            "outcomeExternalMarketId": outcome_external_market_id,
            "side": side, "stakeMusd": stake_musd,
        })

    # -- writes (paper trades; need the matching trade:* scope) ----------------
    def place_spot_order(self, coin_id: str, side: str, order_type: str, quantity: float,
                         limit_price: Optional[float] = None, stop_price: Optional[float] = None) -> dict:
        body: dict[str, Any] = {"coinId": coin_id, "side": side, "orderType": order_type, "quantity": quantity}
        if limit_price is not None:
            body["limitPrice"] = limit_price
        if stop_price is not None:
            body["stopPrice"] = stop_price
        return self._request("POST", "/api/agent/spot/order", body)

    def cancel_spot_order(self, order_id: int) -> dict:
        return self._request("POST", f"/api/agent/spot/order/{order_id}/cancel", {})

    def open_futures(self, coin_id: str, side: str, leverage: float, margin_musd: float,
                     idempotency_key: str, stop_loss_price: Optional[float] = None,
                     take_profit_price: Optional[float] = None) -> dict:
        """Open with optional SL/TP set atomically (long: liq < SL < mark < TP)."""
        body: dict[str, Any] = {
            "coinId": coin_id, "side": side, "leverage": leverage,
            "marginMusd": margin_musd, "idempotencyKey": idempotency_key,
        }
        if stop_loss_price is not None:
            body["stopLossPrice"] = stop_loss_price
        if take_profit_price is not None:
            body["takeProfitPrice"] = take_profit_price
        return self._request("POST", "/api/agent/futures/open", body)

    def set_futures_sl_tp(self, position_id: int, stop_loss_price: Any = "unchanged",
                          take_profit_price: Any = "unchanged") -> dict:
        """Positive number SETS a trigger, None CLEARS it, leave the default to
        keep it unchanged. Naturally idempotent -- no idempotency key."""
        body: dict[str, Any] = {"positionId": position_id}
        if stop_loss_price != "unchanged":
            body["stopLossPrice"] = stop_loss_price
        if take_profit_price != "unchanged":
            body["takeProfitPrice"] = take_profit_price
        return self._request("POST", "/api/agent/futures/sl-tp", body)

    def close_futures(self, position_id: int, idempotency_key: str, fraction: Optional[float] = None) -> dict:
        body: dict[str, Any] = {"positionId": position_id, "idempotencyKey": idempotency_key}
        if fraction is not None:
            body["fraction"] = fraction
        return self._request("POST", "/api/agent/futures/close", body)

    def open_pm(self, source: str, slug: str, outcome_external_market_id: str,
                stake_musd: float, idempotency_key: str, side: str = "yes") -> dict:
        return self._request("POST", "/api/agent/pm/open", {
            "source": source, "slug": slug,
            "outcomeExternalMarketId": outcome_external_market_id,
            "side": side, "stakeMusd": stake_musd, "idempotencyKey": idempotency_key,
        })
