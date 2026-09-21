import datetime

from coinrithm_sdk.models.futures_position import FuturesPosition
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
