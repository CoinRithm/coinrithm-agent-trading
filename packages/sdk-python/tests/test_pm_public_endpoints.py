import datetime as _dt
from typing import Any

from coinrithm_sdk.models.public_pm_expiring_events_response import (
    PublicPmExpiringEventsResponse,
)
from coinrithm_sdk.models.public_pm_microstructure_outcome_type_0 import (
    PublicPmMicrostructureOutcomeType0,
)
from coinrithm_sdk.models.public_pm_order_book_response import PublicPmOrderBookResponse
from coinrithm_sdk.models.public_pm_order_book_type_0 import PublicPmOrderBookType0
from coinrithm_sdk.models.public_pm_resolved_events_response import (
    PublicPmResolvedEventsResponse,
)
from coinrithm_sdk.models.public_pm_surprises_response import PublicPmSurprisesResponse
from coinrithm_sdk.models.public_pm_trades_response import PublicPmTradesResponse
from coinrithm_sdk.types import UNSET


def _normalize_timestamps(value: Any) -> Any:
    """The venues serve Z-suffixed ISO timestamps; Python's datetime.isoformat()
    round-trips them as microsecond-padded +00:00 offsets instead (e.g.
    "...772Z" -> "...772000+00:00"). Recursively normalize both sides through
    this so a round-tripped to_dict() can be compared against the literal
    served payload without the comparison failing on that harmless format
    difference."""
    if isinstance(value, str):
        try:
            return _dt.datetime.fromisoformat(value.replace("Z", "+00:00")).isoformat()
        except ValueError:
            return value
    if isinstance(value, list):
        return [_normalize_timestamps(item) for item in value]
    if isinstance(value, dict):
        return {key: _normalize_timestamps(item) for key, item in value.items()}
    return value


# Served 2026-09-29 by GET /api/prediction-markets/resolved?limit=2, trimmed
# to one row (ForecastEx XRP-lowest-price market). resolvedAtVerified is
# false here (resolvedAtBasis != "provider"), so resolvedAt is null and
# closedAt carries the real observed close time instead of a fabricated one.
RESOLVED_PAYLOAD = {
    "data": [
        {
            "event": {
                "id": "YXLXR_123126_1",
                "slug": "yxlxr-123126-1",
                "title": "Will the lowest price of XRP fall below $1 in 2026?",
                "status": "closed",
                "source": {"id": "forecastex", "name": "ForecastEx"},
                "outcomes": [
                    {
                        "externalMarketId": "YXLXR_123126_1:YES",
                        "name": "Yes",
                        "probability": 95,
                    },
                    {
                        "externalMarketId": "YXLXR_123126_1:NO",
                        "name": "No",
                        "probability": 5,
                    },
                ],
            },
            "resolvedAt": None,
            "resolvedAtVerified": False,
            "closedAt": "2026-08-11T16:01:29.772Z",
            "resolutionOutcome": {
                "externalMarketId": "YXLXR_123126_1:YES",
                "name": "Yes",
                "probability": 95,
                "basis": "source",
            },
        }
    ],
    "pagination": {"limit": 2, "offset": 0, "hasMore": True},
    "meta": {"totalResolved": 1573722, "minVolume": None, "period": None},
}


def test_resolved_entry_parses_and_round_trips() -> None:
    resp = PublicPmResolvedEventsResponse.from_dict(RESOLVED_PAYLOAD)
    entry = resp.data[0]
    assert entry.event.id == "YXLXR_123126_1"
    assert entry.resolved_at is None
    assert entry.resolved_at_verified is False
    assert entry.closed_at is not None
    assert entry.resolution_outcome.probability == 95
    assert entry.resolution_outcome.basis == "source"
    assert resp.pagination.has_more is True
    assert resp.meta.total_resolved == 1573722
    assert resp.meta.min_volume is None
    assert resp.meta.period is None
    assert _normalize_timestamps(resp.to_dict()) == _normalize_timestamps(RESOLVED_PAYLOAD)


def test_resolved_period_is_a_populated_object_when_a_slice_is_requested() -> None:
    # A ?year=&month= slice echoes the requested period instead of null, and
    # totalResolved/minVolume keep their normal (unfiltered-count) meaning.
    sliced = {
        **RESOLVED_PAYLOAD,
        "meta": {"totalResolved": 412, "minVolume": None, "period": {"year": 2026, "month": 8}},
    }
    resp = PublicPmResolvedEventsResponse.from_dict(sliced)
    assert resp.meta.period.year == 2026
    assert resp.meta.period.month == 8
    assert _normalize_timestamps(resp.to_dict()) == _normalize_timestamps(sliced)


# Served 2026-09-29 by GET /api/prediction-markets/surprises?limit=2, trimmed
# to one row (Kalshi "Sinner vs Cerundolo" tennis match — Sinner, the market
# favorite, lost; his opponent's winning outcome priced at 3% 24h before
# resolution, hence the "surprise").
SURPRISE_PAYLOAD = {
    "data": [
        {
            "event": {
                "id": "KXATPMATCH-26MAY28SINCER",
                "slug": "kxatpmatch-26may28sincer",
                "title": "Sinner vs Cerundolo",
                "status": "closed",
                "source": {"id": "kalshi", "name": "Kalshi"},
                "outcomes": [
                    {
                        "externalMarketId": "KXATPMATCH-26MAY28SINCER-CER",
                        "name": "Juan Manuel Cerundolo",
                        "probability": 81,
                    },
                    {
                        "externalMarketId": "KXATPMATCH-26MAY28SINCER-SIN",
                        "name": "Jannik Sinner",
                        "probability": 20,
                    },
                ],
            },
            "resolvedAt": "2026-05-28T13:49:20.052Z",
            "resolvedAtVerified": True,
            "closedAt": "2026-05-28T13:53:47.286Z",
            "resolutionOutcome": {
                "externalMarketId": "KXATPMATCH-26MAY28SINCER-CER",
                "name": "Juan Manuel Cerundolo",
                "probability": 81,
                "basis": "source",
            },
            "surprise": {"t24hProbability": 3, "t7dProbability": None},
        }
    ],
    "window": "all",
    "pagination": {"limit": 2, "offset": 0, "hasMore": True},
}


def test_surprise_entry_parses_and_round_trips() -> None:
    resp = PublicPmSurprisesResponse.from_dict(SURPRISE_PAYLOAD)
    entry = resp.data[0]
    assert resp.window == "all"
    assert entry.resolved_at_verified is True
    assert entry.surprise.t_24_h_probability == 3
    # t7dProbability is frequently absent in practice (not every market has 7
    # days of pre-resolution history) — the served null must round-trip.
    assert entry.surprise.t_7_d_probability is None
    assert _normalize_timestamps(resp.to_dict()) == _normalize_timestamps(SURPRISE_PAYLOAD)


def test_response_strings_accept_values_added_later() -> None:
    # basis and window are plain strings on purpose: a value the API adds
    # later must parse, not raise, in an SDK generated today.
    payload = {**SURPRISE_PAYLOAD, "window": "14d"}
    assert PublicPmSurprisesResponse.from_dict(payload).window == "14d"


# Served 2026-09-29 by GET /api/prediction-markets/expiring?limit=2, trimmed
# to one row (Kalshi hourly BTC-price market) plus the expiresInMs field the
# handler adds on top of the shared PublicPmEvent shape.
EXPIRING_PAYLOAD = {
    "data": [
        {
            "id": "KXBTCD-26SEP2906",
            "slug": "kxbtcd-26sep2906",
            "title": "BTC price on Sep 29, 2026 at 6am EDT?",
            "status": "open",
            "source": {"id": "kalshi", "name": "Kalshi"},
            "outcomes": [
                {"name": "$84,000 or above", "probability": 99},
            ],
            "expiresInMs": 199924,
        }
    ],
    "pagination": {"limit": 2, "offset": 0, "hasMore": True},
    "meta": {
        "totalExpiring": 1824,
        "window": {
            "from": "2026-09-29T09:56:40.076Z",
            "to": "2026-10-06T09:56:40.076Z",
        },
    },
}


def test_expiring_event_carries_expires_in_ms_and_round_trips() -> None:
    resp = PublicPmExpiringEventsResponse.from_dict(EXPIRING_PAYLOAD)
    event = resp.data[0]
    assert event.id == "KXBTCD-26SEP2906"
    assert event.status == "open"
    # expiresInMs is not a declared PublicPmEvent field (the schema documents
    # it separately); it survives round-tripping as an additional property
    # because PublicPmEvent keeps additionalProperties: true.
    assert event["expiresInMs"] == 199924
    assert resp.meta.total_expiring == 1824
    assert resp.meta.window.from_.isoformat() == "2026-09-29T09:56:40.076000+00:00"
    assert _normalize_timestamps(resp.to_dict()) == _normalize_timestamps(EXPIRING_PAYLOAD)


# Served 2026-09-29 by GET /api/prediction-markets/event/kalshi/kxsb-27/orderbook
# (trimmed to two levels per side). Kalshi books never carry askEvidence —
# only Polymarket books do.
KALSHI_ORDERBOOK_PAYLOAD = {
    "source": "kalshi",
    "slug": "kxsb-27",
    "outcome": {"name": "Chicago", "externalMarketId": "KXSB-27-CHI"},
    "orderBook": {
        "bid": 0.03,
        "ask": 0.04,
        "spread": 0.01,
        "midpoint": 0.035,
        "bids": [{"price": 0.03, "size": 712598.81}, {"price": 0.02, "size": 288156.42}],
        "asks": [{"price": 0.04, "size": 1031184.55}, {"price": 0.05, "size": 526132.0}],
    },
}

# Served 2026-09-29 by GET /api/prediction-markets/event/polymarket/
# presidential-election-winner-2028/orderbook (trimmed to one level per
# side). Polymarket books carry askEvidence.
POLYMARKET_ORDERBOOK_PAYLOAD = {
    "source": "polymarket",
    "slug": "presidential-election-winner-2028",
    "outcome": {
        "name": "JD Vance",
        "externalMarketId": (
            "16040015440196279900485035793550429453516625694844857319147506590755961451627"
        ),
    },
    "orderBook": {
        "bid": 0.207,
        "ask": 0.208,
        "spread": 0.001,
        "midpoint": 0.2075,
        "bids": [{"price": 0.207, "size": 7352.65}],
        "asks": [{"price": 0.208, "size": 100.0}],
        "askEvidence": {"validated": True, "receivedAt": "2026-09-29T09:59:59.777Z"},
    },
}

# Served 2026-09-29 by GET /api/prediction-markets/event/manifold/
# what-will-spacex-accomplish-in-the/orderbook. Manifold is not a supported
# microstructure source, so the outcome still resolves (it exists on the
# event) but the book is a valid empty 200, not an error.
MANIFOLD_ORDERBOOK_PAYLOAD = {
    "source": "manifold",
    "slug": "what-will-spacex-accomplish-in-the",
    "outcome": {"name": "1 million satellites", "externalMarketId": "choice:1-million-satellites:LPp9pnzOOl"},
    "orderBook": None,
}


def test_kalshi_orderbook_has_no_ask_evidence_and_round_trips() -> None:
    resp = PublicPmOrderBookResponse.from_dict(KALSHI_ORDERBOOK_PAYLOAD)
    assert isinstance(resp.outcome, PublicPmMicrostructureOutcomeType0)
    assert resp.outcome.name == "Chicago"
    assert isinstance(resp.order_book, PublicPmOrderBookType0)
    assert resp.order_book.bid == 0.03
    assert resp.order_book.ask_evidence is UNSET
    assert "askEvidence" not in resp.to_dict()["orderBook"]
    assert resp.to_dict() == KALSHI_ORDERBOOK_PAYLOAD


def test_polymarket_orderbook_ask_evidence_parses_and_round_trips() -> None:
    resp = PublicPmOrderBookResponse.from_dict(POLYMARKET_ORDERBOOK_PAYLOAD)
    assert isinstance(resp.order_book, PublicPmOrderBookType0)
    assert resp.order_book.ask_evidence is not UNSET
    assert resp.order_book.ask_evidence.validated is True
    assert _normalize_timestamps(resp.to_dict()) == _normalize_timestamps(POLYMARKET_ORDERBOOK_PAYLOAD)


def test_orderbook_is_null_for_an_unsupported_or_empty_source() -> None:
    resp = PublicPmOrderBookResponse.from_dict(MANIFOLD_ORDERBOOK_PAYLOAD)
    assert resp.order_book is None
    assert resp.to_dict() == MANIFOLD_ORDERBOOK_PAYLOAD


# Served 2026-09-29 by GET /api/prediction-markets/event/kalshi/kxsb-27/trades
# (trimmed to one row of the 20 the server always returns; the code ignores
# any limit/offset query params, so a served response is never a smaller
# slice by request).
KALSHI_TRADES_PAYLOAD = {
    "source": "kalshi",
    "slug": "kxsb-27",
    "outcome": {"name": "Chicago", "externalMarketId": "KXSB-27-CHI"},
    "trades": [
        {
            "side": "yes",
            "price": 0.04,
            "size": 3.27,
            "usdValue": 0.1308,
            "outcome": None,
            "who": None,
            "timestamp": "2026-09-29T09:26:02.017Z",
        }
    ],
}

# Served 2026-09-29 by GET /api/prediction-markets/event/polymarket/
# presidential-election-winner-2028/trades. Polymarket trades carry a named
# outcome and a public pseudonym; Kalshi trades never do (see above).
POLYMARKET_TRADES_PAYLOAD = {
    "source": "polymarket",
    "slug": "presidential-election-winner-2028",
    "outcome": {
        "name": "JD Vance",
        "externalMarketId": (
            "16040015440196279900485035793550429453516625694844857319147506590755961451627"
        ),
    },
    "trades": [
        {
            "side": "buy",
            "price": 0.793,
            "size": 49.77,
            "usdValue": 39.46761,
            "outcome": "No",
            "who": "Knowledgeable-Convection",
            "timestamp": "2026-09-29T05:44:12.000Z",
        }
    ],
}

# Served 2026-09-29 by GET /api/prediction-markets/event/manifold/
# what-will-spacex-accomplish-in-the/trades. An unsupported source answers
# 200 with an empty trades array, not an error.
MANIFOLD_TRADES_PAYLOAD = {
    "source": "manifold",
    "slug": "what-will-spacex-accomplish-in-the",
    "outcome": {"name": "1 million satellites", "externalMarketId": "choice:1-million-satellites:LPp9pnzOOl"},
    "trades": [],
}


def test_kalshi_trade_has_no_outcome_or_who_and_round_trips() -> None:
    resp = PublicPmTradesResponse.from_dict(KALSHI_TRADES_PAYLOAD)
    trade = resp.trades[0]
    assert trade.side == "yes"
    assert trade.outcome is None
    assert trade.who is None
    assert _normalize_timestamps(resp.to_dict()) == _normalize_timestamps(KALSHI_TRADES_PAYLOAD)


def test_polymarket_trade_carries_outcome_and_who_and_round_trips() -> None:
    resp = PublicPmTradesResponse.from_dict(POLYMARKET_TRADES_PAYLOAD)
    trade = resp.trades[0]
    assert trade.side == "buy"
    assert trade.outcome == "No"
    assert trade.who == "Knowledgeable-Convection"
    assert _normalize_timestamps(resp.to_dict()) == _normalize_timestamps(POLYMARKET_TRADES_PAYLOAD)


def test_trades_is_an_empty_list_for_an_unsupported_or_quiet_source() -> None:
    resp = PublicPmTradesResponse.from_dict(MANIFOLD_TRADES_PAYLOAD)
    assert resp.trades == []
    assert resp.to_dict() == MANIFOLD_TRADES_PAYLOAD
