"""Preserve current server eligibility evidence and older API responses."""

import datetime

import pytest

from coinrithm_sdk.models.get_market_context_response_200 import GetMarketContextResponse200
from coinrithm_sdk.types import UNSET


@pytest.mark.parametrize("status", ["eligible", "reference_stale", "reference_unavailable"])
def test_market_context_preserves_reference_eligibility(status):
    # Server dates are UTC ISO instants; nullable reference fields remain null.
    reference = {
        "status": status,
        "referenceRequired": True,
        "venue": None if status == "reference_unavailable" else "binance",
        "symbol": None if status == "reference_unavailable" else "BTCUSDT",
        "referenceFetchedAt": None if status == "reference_unavailable" else "2026-09-30T02:15:11.078Z",
        "maxReferenceAgeHours": 6,
        "evaluatedAt": "2026-09-30T02:19:43.015Z",
    }
    response = GetMarketContextResponse200.from_dict({"futuresEntryEligibility": reference})
    eligibility = response.futures_entry_eligibility
    assert eligibility.status.value == status
    assert eligibility.reference_required is True
    assert eligibility.max_reference_age_hours == 6
    assert eligibility.evaluated_at == datetime.datetime(2026, 9, 30, 2, 19, 43, 15000, datetime.timezone.utc)
    wire = response.to_dict()["futuresEntryEligibility"]
    assert wire["status"] == status
    assert wire["venue"] == reference["venue"]
    assert wire["symbol"] == reference["symbol"]
    assert wire["referenceFetchedAt"] == (
        None if reference["referenceFetchedAt"] is None else "2026-09-30T02:15:11.078000+00:00"
    )


def test_older_market_context_leaves_eligibility_unknown():
    response = GetMarketContextResponse200.from_dict({"asOf": "2026-09-30T02:19:43+00:00"})
    assert response.futures_entry_eligibility is UNSET
    assert "futuresEntryEligibility" not in response.to_dict()


@pytest.mark.parametrize(
    "timestamp,offset",
    [
        ("2026-09-30T02:19:43.015Z", datetime.timedelta(0)),
        ("2026-09-30T02:19:43.015+00:00", datetime.timedelta(0)),
        ("2026-09-30T02:19:43.015+05:30", datetime.timedelta(hours=5, minutes=30)),
        ("2026-09-30T02:19:43.015-04:00", datetime.timedelta(hours=-4)),
    ],
)
def test_market_context_timestamp_preserves_offset(timestamp, offset):
    response = GetMarketContextResponse200.from_dict({"asOf": timestamp})
    assert response.as_of.utcoffset() == offset
    assert response.as_of.microsecond == 15000
    assert GetMarketContextResponse200.from_dict(response.to_dict()).as_of == response.as_of


@pytest.mark.parametrize("timestamp", ["not-a-date", "2026-13-30T02:19:43Z", "2026-09-30T25:19:43Z"])
def test_market_context_rejects_invalid_timestamp(timestamp):
    with pytest.raises(ValueError):
        GetMarketContextResponse200.from_dict({"asOf": timestamp})
