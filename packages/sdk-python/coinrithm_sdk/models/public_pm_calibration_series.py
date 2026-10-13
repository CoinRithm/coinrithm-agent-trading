from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_pm_calibration_series_scored_item import PublicPmCalibrationSeriesScoredItem


T = TypeVar("T", bound="PublicPmCalibrationSeries")


@_attrs_define
class PublicPmCalibrationSeries:
    """
    Attributes:
        methodology (str):
        min_sample (int):
        scored (list[PublicPmCalibrationSeriesScoredItem]):
    """

    methodology: str
    min_sample: int
    scored: list[PublicPmCalibrationSeriesScoredItem]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        methodology = self.methodology

        min_sample = self.min_sample

        scored = []
        for scored_item_data in self.scored:
            scored_item = scored_item_data.to_dict()
            scored.append(scored_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "methodology": methodology,
                "minSample": min_sample,
                "scored": scored,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_calibration_series_scored_item import PublicPmCalibrationSeriesScoredItem

        d = dict(src_dict)
        methodology = d.pop("methodology")

        min_sample = d.pop("minSample")

        scored = []
        _scored = d.pop("scored")
        for scored_item_data in _scored:
            scored_item = PublicPmCalibrationSeriesScoredItem.from_dict(scored_item_data)

            scored.append(scored_item)

        public_pm_calibration_series = cls(
            methodology=methodology,
            min_sample=min_sample,
            scored=scored,
        )

        public_pm_calibration_series.additional_properties = d
        return public_pm_calibration_series

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
