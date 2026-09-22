import datetime

from coinrithm_sdk.models.futures_position import FuturesPosition
from coinrithm_sdk.models.futures_funding_quote import FuturesFundingQuote
from coinrithm_sdk.models.futures_quote_response import FuturesQuoteResponse
from coinrithm_sdk.types import UNSET, Unset


def test_futures_funding_round_trip_preserves_signed_and_zero_values():
    applied_through = datetime.datetime(2026, 9, 21, 12, 34, 56, tzinfo=datetime.timezone.utc)
    position = FuturesPosition(
        funding_paid_musd=-0.37,
        funding_applied_through=applied_through,
    )

    wire = position.to_dict()
    assert wire["fundingPaidMusd"] == -0.37
    assert wire["fundingAppliedThrough"] == "2026-09-21T12:34:56+00:00"
    restored = FuturesPosition.from_dict(wire)
    assert restored.funding_paid_musd == -0.37
    assert restored.funding_applied_through == applied_through

    zero = FuturesPosition(funding_paid_musd=0.0, funding_applied_through=None)
    zero_wire = zero.to_dict()
    assert zero_wire["fundingPaidMusd"] == 0.0
    assert zero_wire["fundingAppliedThrough"] is None


def test_futures_funding_round_trip_preserves_missing_fields():
    position = FuturesPosition()
    assert isinstance(position.funding_paid_musd, Unset)
    assert isinstance(position.funding_applied_through, Unset)
    assert "fundingPaidMusd" not in position.to_dict()
    assert "fundingAppliedThrough" not in position.to_dict()

    restored = FuturesPosition.from_dict({})
    assert restored.funding_paid_musd is UNSET
    assert restored.funding_applied_through is UNSET


def test_futures_quote_funding_round_trip_preserves_signed_zero_null_and_absent():
    next_funding = datetime.datetime(2026, 9, 22, tzinfo=datetime.timezone.utc)
    as_of = datetime.datetime(2026, 9, 21, 23, 55, tzinfo=datetime.timezone.utc)
    funding = FuturesFundingQuote(
        venue="binance",
        symbol="BTCUSDT",
        rate=-0.0001,
        interval_hours=8,
        next_funding_time=next_funding,
        as_of=as_of,
        estimated_per_interval_musd=-0.1,
        annualized_rate=-0.1095,
    )
    response = FuturesQuoteResponse(funding=funding)
    wire = response.to_dict()
    assert wire["funding"]["rate"] == -0.0001
    assert wire["funding"]["estimatedPerIntervalMusd"] == -0.1
    restored = FuturesQuoteResponse.from_dict(wire)
    assert restored.funding.rate == -0.0001
    assert restored.funding.estimated_per_interval_musd == -0.1

    zero_wire = FuturesQuoteResponse(
        funding=FuturesFundingQuote(
            venue="binance",
            symbol="BTCUSDT",
            rate=0.0,
            interval_hours=8,
            next_funding_time=next_funding,
            as_of=as_of,
            estimated_per_interval_musd=0.0,
            annualized_rate=0.0,
        )
    ).to_dict()
    assert zero_wire["funding"]["estimatedPerIntervalMusd"] == 0.0

    assert FuturesQuoteResponse(funding=None).to_dict()["funding"] is None
    assert "funding" not in FuturesQuoteResponse().to_dict()
