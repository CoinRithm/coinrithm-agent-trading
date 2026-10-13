from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmCalibrationSeriesScoredItemByYearItem")


@_attrs_define
class PublicPmCalibrationSeriesScoredItemByYearItem:
    """
    Attributes:
        year (int | Unset):
        sample_size (int | Unset):
        calibration_error (float | Unset):
        mean_winner_confidence (float | Unset):
    """

    year: int | Unset = UNSET
    sample_size: int | Unset = UNSET
    calibration_error: float | Unset = UNSET
    mean_winner_confidence: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        year = self.year

        sample_size = self.sample_size

        calibration_error = self.calibration_error

        mean_winner_confidence = self.mean_winner_confidence

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if year is not UNSET:
            field_dict["year"] = year
        if sample_size is not UNSET:
            field_dict["sampleSize"] = sample_size
        if calibration_error is not UNSET:
            field_dict["calibrationError"] = calibration_error
        if mean_winner_confidence is not UNSET:
            field_dict["meanWinnerConfidence"] = mean_winner_confidence

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        year = d.pop("year", UNSET)

        sample_size = d.pop("sampleSize", UNSET)

        calibration_error = d.pop("calibrationError", UNSET)

        mean_winner_confidence = d.pop("meanWinnerConfidence", UNSET)

        public_pm_calibration_series_scored_item_by_year_item = cls(
            year=year,
            sample_size=sample_size,
            calibration_error=calibration_error,
            mean_winner_confidence=mean_winner_confidence,
        )

        public_pm_calibration_series_scored_item_by_year_item.additional_properties = d
        return public_pm_calibration_series_scored_item_by_year_item

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
