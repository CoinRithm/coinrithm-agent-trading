from coinrithm_sdk.models.get_candles_response_200_candles_item import (
    GetCandlesResponse200CandlesItem,
)
from coinrithm_sdk.types import UNSET


def test_candle_vm_round_trips_zero_and_positive_values() -> None:
    zero = GetCandlesResponse200CandlesItem.from_dict({"v": 10.0, "vm": 0})
    partial = GetCandlesResponse200CandlesItem.from_dict({"v": 10.0, "vm": 2})

    assert zero.vm == 0
    assert partial.vm == 2
    assert zero.to_dict()["vm"] == 0
    assert partial.to_dict()["vm"] == 2


def test_candle_vm_accepts_unknown_null_coverage() -> None:
    unknown = GetCandlesResponse200CandlesItem.from_dict({"v": 10.0, "vm": None})

    assert unknown.vm is None
    assert unknown.to_dict()["vm"] is None


def test_candle_vm_absent_is_unset_and_extra_fields_are_preserved() -> None:
    absent = GetCandlesResponse200CandlesItem.from_dict(
        {"v": 10.0, "future": "preserved"}
    )

    assert absent.vm is UNSET
    assert absent.to_dict()["future"] == "preserved"
