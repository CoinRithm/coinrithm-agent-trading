from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_calibration_series_scored_item_by_year_item import (
        PublicPmCalibrationSeriesScoredItemByYearItem,
    )
    from ..models.public_pm_calibration_series_scored_item_reliability_item import (
        PublicPmCalibrationSeriesScoredItemReliabilityItem,
    )


T = TypeVar("T", bound="PublicPmCalibrationSeriesScoredItem")


@_attrs_define
class PublicPmCalibrationSeriesScoredItem:
    """
    Attributes:
        source (str | Unset):
        name (str | Unset):
        basis (str | Unset):
        sample_size (int | Unset):
        calibration_error (float | Unset): Expected calibration error, 0-1 (lower is better).
        mean_winner_confidence (float | Unset): Mean probability assigned to the eventual winner, 0-1.
        median_lead_seconds (float | None | Unset): `ownCapture` only: median seconds between the scored capture and
            resolution.
        p_90_lead_seconds (float | None | Unset): `ownCapture` only: 90th percentile of that lead.
        reliability (list[PublicPmCalibrationSeriesScoredItemReliabilityItem] | Unset):
        by_year (list[PublicPmCalibrationSeriesScoredItemByYearItem] | Unset):
    """

    source: str | Unset = UNSET
    name: str | Unset = UNSET
    basis: str | Unset = UNSET
    sample_size: int | Unset = UNSET
    calibration_error: float | Unset = UNSET
    mean_winner_confidence: float | Unset = UNSET
    median_lead_seconds: float | None | Unset = UNSET
    p_90_lead_seconds: float | None | Unset = UNSET
    reliability: list[PublicPmCalibrationSeriesScoredItemReliabilityItem] | Unset = UNSET
    by_year: list[PublicPmCalibrationSeriesScoredItemByYearItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        source = self.source

        name = self.name

        basis = self.basis

        sample_size = self.sample_size

        calibration_error = self.calibration_error

        mean_winner_confidence = self.mean_winner_confidence

        median_lead_seconds: float | None | Unset
        if isinstance(self.median_lead_seconds, Unset):
            median_lead_seconds = UNSET
        else:
            median_lead_seconds = self.median_lead_seconds

        p_90_lead_seconds: float | None | Unset
        if isinstance(self.p_90_lead_seconds, Unset):
            p_90_lead_seconds = UNSET
        else:
            p_90_lead_seconds = self.p_90_lead_seconds

        reliability: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.reliability, Unset):
            reliability = []
            for reliability_item_data in self.reliability:
                reliability_item = reliability_item_data.to_dict()
                reliability.append(reliability_item)

        by_year: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.by_year, Unset):
            by_year = []
            for by_year_item_data in self.by_year:
                by_year_item = by_year_item_data.to_dict()
                by_year.append(by_year_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if source is not UNSET:
            field_dict["source"] = source
        if name is not UNSET:
            field_dict["name"] = name
        if basis is not UNSET:
            field_dict["basis"] = basis
        if sample_size is not UNSET:
            field_dict["sampleSize"] = sample_size
        if calibration_error is not UNSET:
            field_dict["calibrationError"] = calibration_error
        if mean_winner_confidence is not UNSET:
            field_dict["meanWinnerConfidence"] = mean_winner_confidence
        if median_lead_seconds is not UNSET:
            field_dict["medianLeadSeconds"] = median_lead_seconds
        if p_90_lead_seconds is not UNSET:
            field_dict["p90LeadSeconds"] = p_90_lead_seconds
        if reliability is not UNSET:
            field_dict["reliability"] = reliability
        if by_year is not UNSET:
            field_dict["byYear"] = by_year

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_calibration_series_scored_item_by_year_item import (
            PublicPmCalibrationSeriesScoredItemByYearItem,
        )
        from ..models.public_pm_calibration_series_scored_item_reliability_item import (
            PublicPmCalibrationSeriesScoredItemReliabilityItem,
        )

        d = dict(src_dict)
        source = d.pop("source", UNSET)

        name = d.pop("name", UNSET)

        basis = d.pop("basis", UNSET)

        sample_size = d.pop("sampleSize", UNSET)

        calibration_error = d.pop("calibrationError", UNSET)

        mean_winner_confidence = d.pop("meanWinnerConfidence", UNSET)

        def _parse_median_lead_seconds(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        median_lead_seconds = _parse_median_lead_seconds(d.pop("medianLeadSeconds", UNSET))

        def _parse_p_90_lead_seconds(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        p_90_lead_seconds = _parse_p_90_lead_seconds(d.pop("p90LeadSeconds", UNSET))

        _reliability = d.pop("reliability", UNSET)
        reliability: list[PublicPmCalibrationSeriesScoredItemReliabilityItem] | Unset = UNSET
        if _reliability is not UNSET:
            reliability = []
            for reliability_item_data in _reliability:
                reliability_item = PublicPmCalibrationSeriesScoredItemReliabilityItem.from_dict(reliability_item_data)

                reliability.append(reliability_item)

        _by_year = d.pop("byYear", UNSET)
        by_year: list[PublicPmCalibrationSeriesScoredItemByYearItem] | Unset = UNSET
        if _by_year is not UNSET:
            by_year = []
            for by_year_item_data in _by_year:
                by_year_item = PublicPmCalibrationSeriesScoredItemByYearItem.from_dict(by_year_item_data)

                by_year.append(by_year_item)

        public_pm_calibration_series_scored_item = cls(
            source=source,
            name=name,
            basis=basis,
            sample_size=sample_size,
            calibration_error=calibration_error,
            mean_winner_confidence=mean_winner_confidence,
            median_lead_seconds=median_lead_seconds,
            p_90_lead_seconds=p_90_lead_seconds,
            reliability=reliability,
            by_year=by_year,
        )

        public_pm_calibration_series_scored_item.additional_properties = d
        return public_pm_calibration_series_scored_item

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
