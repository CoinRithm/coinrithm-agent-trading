from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmCalibrationResponseScoredItemReliabilityItem")


@_attrs_define
class PublicPmCalibrationResponseScoredItemReliabilityItem:
    """
    Attributes:
        bucket (str | Unset):
        predicted_mean (float | Unset):
        realized_rate (float | Unset):
        pairs (int | Unset):
    """

    bucket: str | Unset = UNSET
    predicted_mean: float | Unset = UNSET
    realized_rate: float | Unset = UNSET
    pairs: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        bucket = self.bucket

        predicted_mean = self.predicted_mean

        realized_rate = self.realized_rate

        pairs = self.pairs

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if bucket is not UNSET:
            field_dict["bucket"] = bucket
        if predicted_mean is not UNSET:
            field_dict["predictedMean"] = predicted_mean
        if realized_rate is not UNSET:
            field_dict["realizedRate"] = realized_rate
        if pairs is not UNSET:
            field_dict["pairs"] = pairs

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        bucket = d.pop("bucket", UNSET)

        predicted_mean = d.pop("predictedMean", UNSET)

        realized_rate = d.pop("realizedRate", UNSET)

        pairs = d.pop("pairs", UNSET)

        public_pm_calibration_response_scored_item_reliability_item = cls(
            bucket=bucket,
            predicted_mean=predicted_mean,
            realized_rate=realized_rate,
            pairs=pairs,
        )

        public_pm_calibration_response_scored_item_reliability_item.additional_properties = d
        return public_pm_calibration_response_scored_item_reliability_item

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
