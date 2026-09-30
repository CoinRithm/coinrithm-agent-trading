from datetime import datetime, timedelta

from coinrithm_sdk.models.spot_quote_response import SpotQuoteResponse
from coinrithm_sdk.types import UNSET

# Shape from backend-v2 #112 (controllers/agent/spotPriceTiming.ts): a spot
# quote whose venue snapshot time trails the row write by 25 s.
QUOTE = {
    "eligible": True,
    "blockReasons": [],
    "side": "buy",
    "quantity": 2,
    "orderType": "market",
    "executionPrice": 100.04,
    "freshness": {"asOf": "2026-09-30T05:59:40.000Z", "ageSeconds": 20, "status": "fresh"},
    "priceTiming": {
        "rowWrittenAt": "2026-09-30T05:59:40.000Z",
        "sourceObservedAt": "2026-09-30T05:59:15.000Z",
        "sourceAgeSeconds": 45,
        "writeLagSeconds": 25,
        "coverage": "recorded",
        "basis": "venue_snapshot_time",
    },
}


def test_price_timing_parses_and_round_trips() -> None:
    for observed_at in ("2026-09-30T05:59:15.000Z", "2026-09-30T05:59:15.123Z"):
        quote = SpotQuoteResponse.from_dict({
            **QUOTE, "priceTiming": {**QUOTE["priceTiming"], "sourceObservedAt": observed_at},
        })
        assert quote.price_timing.coverage == "recorded"
        assert quote.price_timing.write_lag_seconds == 25
        expected = datetime.fromisoformat(observed_at.replace("Z", "+00:00"))
        actual = datetime.fromisoformat(quote.to_dict()["priceTiming"]["sourceObservedAt"].replace("Z", "+00:00"))
        assert actual == expected
        assert actual.utcoffset() == timedelta(0)
        assert actual.microsecond == expected.microsecond


def test_negative_lag_and_unrecorded_timing_stay_explicit() -> None:
    skewed = SpotQuoteResponse.from_dict({**QUOTE, "priceTiming": {**QUOTE["priceTiming"], "writeLagSeconds": -120}})
    assert skewed.price_timing.write_lag_seconds == -120
    unknown = SpotQuoteResponse.from_dict({**QUOTE, "priceTiming": {
        "rowWrittenAt": "2026-09-30T05:59:40.000Z", "sourceObservedAt": None,
        "sourceAgeSeconds": None, "writeLagSeconds": None,
        "coverage": "not_recorded", "basis": "venue_snapshot_time"}})
    assert unknown.price_timing.coverage == "not_recorded"
    assert unknown.price_timing.source_observed_at is None


def test_price_timing_is_optional_for_older_apis() -> None:
    legacy = SpotQuoteResponse.from_dict({k: v for k, v in QUOTE.items() if k != "priceTiming"})
    assert legacy.price_timing is UNSET
    assert "priceTiming" not in legacy.to_dict()
