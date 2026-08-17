from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_calibration_response_scored_item_excluded import (
        PublicPmCalibrationResponseScoredItemExcluded,
    )
    from ..models.public_pm_calibration_response_scored_item_reliability_item import (
        PublicPmCalibrationResponseScoredItemReliabilityItem,
    )


T = TypeVar("T", bound="PublicPmCalibrationResponseScoredItem")


@_attrs_define
class PublicPmCalibrationResponseScoredItem:
    """
    Attributes:
        source (str | Unset):
        name (str | Unset):
        sample_size (int | Unset): Events actually scored: those whose t-24h snapshot captured the market's COMPLETE
            outcome book. Read alongside `excluded` — the exclusion rate differs sharply by venue, so sampleSize is not
            comparable across venues on its own.
        calibration_error (float | Unset):
        mean_winner_confidence (float | Unset):
        excluded (PublicPmCalibrationResponseScoredItemExcluded | Unset): Cohort events NOT scored, by reason. Published
            so a consumer can see how much of a venue's corpus stands behind the number.
        reliability (list[PublicPmCalibrationResponseScoredItemReliabilityItem] | Unset):
    """

    source: str | Unset = UNSET
    name: str | Unset = UNSET
    sample_size: int | Unset = UNSET
    calibration_error: float | Unset = UNSET
    mean_winner_confidence: float | Unset = UNSET
    excluded: PublicPmCalibrationResponseScoredItemExcluded | Unset = UNSET
    reliability: list[PublicPmCalibrationResponseScoredItemReliabilityItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        source = self.source

        name = self.name

        sample_size = self.sample_size

        calibration_error = self.calibration_error

        mean_winner_confidence = self.mean_winner_confidence

        excluded: dict[str, Any] | Unset = UNSET
        if not isinstance(self.excluded, Unset):
            excluded = self.excluded.to_dict()

        reliability: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.reliability, Unset):
            reliability = []
            for reliability_item_data in self.reliability:
                reliability_item = reliability_item_data.to_dict()
                reliability.append(reliability_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if source is not UNSET:
            field_dict["source"] = source
        if name is not UNSET:
            field_dict["name"] = name
        if sample_size is not UNSET:
            field_dict["sampleSize"] = sample_size
        if calibration_error is not UNSET:
            field_dict["calibrationError"] = calibration_error
        if mean_winner_confidence is not UNSET:
            field_dict["meanWinnerConfidence"] = mean_winner_confidence
        if excluded is not UNSET:
            field_dict["excluded"] = excluded
        if reliability is not UNSET:
            field_dict["reliability"] = reliability

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_calibration_response_scored_item_excluded import (
            PublicPmCalibrationResponseScoredItemExcluded,
        )
        from ..models.public_pm_calibration_response_scored_item_reliability_item import (
            PublicPmCalibrationResponseScoredItemReliabilityItem,
        )

        d = dict(src_dict)
        source = d.pop("source", UNSET)

        name = d.pop("name", UNSET)

        sample_size = d.pop("sampleSize", UNSET)

        calibration_error = d.pop("calibrationError", UNSET)

        mean_winner_confidence = d.pop("meanWinnerConfidence", UNSET)

        _excluded = d.pop("excluded", UNSET)
        excluded: PublicPmCalibrationResponseScoredItemExcluded | Unset
        if isinstance(_excluded, Unset):
            excluded = UNSET
        else:
            excluded = PublicPmCalibrationResponseScoredItemExcluded.from_dict(_excluded)

        _reliability = d.pop("reliability", UNSET)
        reliability: list[PublicPmCalibrationResponseScoredItemReliabilityItem] | Unset = UNSET
        if _reliability is not UNSET:
            reliability = []
            for reliability_item_data in _reliability:
                reliability_item = PublicPmCalibrationResponseScoredItemReliabilityItem.from_dict(reliability_item_data)

                reliability.append(reliability_item)

        public_pm_calibration_response_scored_item = cls(
            source=source,
            name=name,
            sample_size=sample_size,
            calibration_error=calibration_error,
            mean_winner_confidence=mean_winner_confidence,
            excluded=excluded,
            reliability=reliability,
        )

        public_pm_calibration_response_scored_item.additional_properties = d
        return public_pm_calibration_response_scored_item

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
