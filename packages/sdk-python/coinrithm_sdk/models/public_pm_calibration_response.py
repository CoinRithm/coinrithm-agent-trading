from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_calibration_response_pending_item import PublicPmCalibrationResponsePendingItem
    from ..models.public_pm_calibration_response_scored_item import PublicPmCalibrationResponseScoredItem
    from ..models.public_pm_calibration_series import PublicPmCalibrationSeries


T = TypeVar("T", bound="PublicPmCalibrationResponse")


@_attrs_define
class PublicPmCalibrationResponse:
    """
    Attributes:
        lead_hours (float):
        min_sample (int):
        scored (list[PublicPmCalibrationResponseScoredItem]):
        pending (list[PublicPmCalibrationResponsePendingItem]):
        methodology (str | Unset):
        methodology_version (str | Unset): Version of the calibration methodology that produced this payload.
        final_price (PublicPmCalibrationSeries | Unset):
        own_capture (PublicPmCalibrationSeries | Unset):
    """

    lead_hours: float
    min_sample: int
    scored: list[PublicPmCalibrationResponseScoredItem]
    pending: list[PublicPmCalibrationResponsePendingItem]
    methodology: str | Unset = UNSET
    methodology_version: str | Unset = UNSET
    final_price: PublicPmCalibrationSeries | Unset = UNSET
    own_capture: PublicPmCalibrationSeries | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        lead_hours = self.lead_hours

        min_sample = self.min_sample

        scored = []
        for scored_item_data in self.scored:
            scored_item = scored_item_data.to_dict()
            scored.append(scored_item)

        pending = []
        for pending_item_data in self.pending:
            pending_item = pending_item_data.to_dict()
            pending.append(pending_item)

        methodology = self.methodology

        methodology_version = self.methodology_version

        final_price: dict[str, Any] | Unset = UNSET
        if not isinstance(self.final_price, Unset):
            final_price = self.final_price.to_dict()

        own_capture: dict[str, Any] | Unset = UNSET
        if not isinstance(self.own_capture, Unset):
            own_capture = self.own_capture.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "leadHours": lead_hours,
                "minSample": min_sample,
                "scored": scored,
                "pending": pending,
            }
        )
        if methodology is not UNSET:
            field_dict["methodology"] = methodology
        if methodology_version is not UNSET:
            field_dict["methodologyVersion"] = methodology_version
        if final_price is not UNSET:
            field_dict["finalPrice"] = final_price
        if own_capture is not UNSET:
            field_dict["ownCapture"] = own_capture

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_calibration_response_pending_item import PublicPmCalibrationResponsePendingItem
        from ..models.public_pm_calibration_response_scored_item import PublicPmCalibrationResponseScoredItem
        from ..models.public_pm_calibration_series import PublicPmCalibrationSeries

        d = dict(src_dict)
        lead_hours = d.pop("leadHours")

        min_sample = d.pop("minSample")

        scored = []
        _scored = d.pop("scored")
        for scored_item_data in _scored:
            scored_item = PublicPmCalibrationResponseScoredItem.from_dict(scored_item_data)

            scored.append(scored_item)

        pending = []
        _pending = d.pop("pending")
        for pending_item_data in _pending:
            pending_item = PublicPmCalibrationResponsePendingItem.from_dict(pending_item_data)

            pending.append(pending_item)

        methodology = d.pop("methodology", UNSET)

        methodology_version = d.pop("methodologyVersion", UNSET)

        _final_price = d.pop("finalPrice", UNSET)
        final_price: PublicPmCalibrationSeries | Unset
        if isinstance(_final_price, Unset):
            final_price = UNSET
        else:
            final_price = PublicPmCalibrationSeries.from_dict(_final_price)

        _own_capture = d.pop("ownCapture", UNSET)
        own_capture: PublicPmCalibrationSeries | Unset
        if isinstance(_own_capture, Unset):
            own_capture = UNSET
        else:
            own_capture = PublicPmCalibrationSeries.from_dict(_own_capture)

        public_pm_calibration_response = cls(
            lead_hours=lead_hours,
            min_sample=min_sample,
            scored=scored,
            pending=pending,
            methodology=methodology,
            methodology_version=methodology_version,
            final_price=final_price,
            own_capture=own_capture,
        )

        return public_pm_calibration_response
