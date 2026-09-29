from coinrithm_sdk.models.get_public_prediction_market_price_history_interval import (
    GetPublicPredictionMarketPriceHistoryInterval,
)
from coinrithm_sdk.models.get_public_prediction_market_price_history_response_200 import (
    GetPublicPredictionMarketPriceHistoryResponse200,
)
from coinrithm_sdk.models.get_public_prediction_market_price_history_response_200_outcome_type_0 import (
    GetPublicPredictionMarketPriceHistoryResponse200OutcomeType0,
)
from coinrithm_sdk.types import UNSET

# Served 2026-09-29 by GET /api/prediction-markets/event/polymarket/
# democratic-presidential-nominee-2028/price-history?interval=1d (1,441 points,
# trimmed to two). The old contract declared markets[].history[], which the API
# never returned, so a generated client read nothing.
SERVED = {
    "source": "polymarket",
    "slug": "democratic-presidential-nominee-2028",
    "interval": "1d",
    "points": [
        {"t": 1790568975000, "p": 0.1825},
        {"t": 1790655335000, "p": 0.1855},
    ],
}
OUTCOME = {"name": "Alexandria Ocasio-Cortez", "externalMarketId": "1070649"}


def test_served_points_parse_and_round_trip() -> None:
    history = GetPublicPredictionMarketPriceHistoryResponse200.from_dict({**SERVED, "outcome": OUTCOME})
    assert history.interval == "1d"
    assert [(p.t, p.p) for p in history.points] == [
        (1790568975000, 0.1825),
        (1790655335000, 0.1855),
    ]
    assert isinstance(history.outcome, GetPublicPredictionMarketPriceHistoryResponse200OutcomeType0)
    assert history.outcome.name == "Alexandria Ocasio-Cortez"
    assert history.to_dict() == {**SERVED, "outcome": OUTCOME}


def test_outcome_is_optional_and_nullable() -> None:
    # Responses from before the backend named the outcome have no field.
    before = GetPublicPredictionMarketPriceHistoryResponse200.from_dict(SERVED)
    assert before.outcome is UNSET
    assert "outcome" not in before.to_dict()
    # An event with no outcomes answers null.
    none = GetPublicPredictionMarketPriceHistoryResponse200.from_dict({**SERVED, "outcome": None, "points": []})
    assert none.outcome is None
    assert none.points == []


def test_a_range_the_sdk_does_not_know_still_parses() -> None:
    # The served interval is a plain string, so a range added later does not
    # break older clients.
    history = GetPublicPredictionMarketPriceHistoryResponse200.from_dict({**SERVED, "interval": "3m"})
    assert history.interval == "3m"


def test_request_ranges_are_the_served_lookbacks() -> None:
    assert {i.value for i in GetPublicPredictionMarketPriceHistoryInterval} == {
        "1h",
        "6h",
        "1d",
        "1w",
        "1m",
        "max",
    }
