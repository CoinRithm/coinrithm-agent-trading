from coinrithm_sdk.models.public_pm_outcome import PublicPmOutcome
from coinrithm_sdk.types import UNSET

# Served 2026-09-29 by GET /api/prediction-markets/events/polymarket/
# lowest-temperature-in-buenos-aires-on-september-29-2026 (trimmed): a traded
# leg, a never-traded wide-book leg whose 50 is only the book midpoint, and a
# tight-book leg.
SERVED = [
    {"externalMarketId": "11c", "name": "11°C", "probability": 90, "priceBasis": "last_trade"},
    {"externalMarketId": "12c", "name": "12°C", "probability": 50, "priceBasis": "unquoted"},
    {"externalMarketId": "10c", "name": "10°C or below", "probability": 1, "priceBasis": "book_mid"},
]


def test_price_basis_parses_and_round_trips() -> None:
    outcomes = [PublicPmOutcome.from_dict(row) for row in SERVED]
    assert [o.price_basis for o in outcomes] == ["last_trade", "unquoted", "book_mid"]
    assert [o.to_dict()["priceBasis"] for o in outcomes] == ["last_trade", "unquoted", "book_mid"]


def test_price_basis_is_optional() -> None:
    legacy = PublicPmOutcome.from_dict({"externalMarketId": "x", "name": "Yes", "probability": 40})
    assert legacy.price_basis is UNSET
    assert "priceBasis" not in legacy.to_dict()


def test_unknown_price_basis_passes_through() -> None:
    # A plain string on purpose: a basis the API adds later must not break parsing.
    outcome = PublicPmOutcome.from_dict({"name": "Yes", "probability": 40, "priceBasis": "settlement_mark"})
    assert outcome.price_basis == "settlement_mark"
