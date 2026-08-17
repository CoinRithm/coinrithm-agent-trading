from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_calibration_response_pending_item import PublicPmCalibrationResponsePendingItem
    from ..models.public_pm_calibration_response_scored_item import PublicPmCalibrationResponseScoredItem


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
    """

    lead_hours: float
    min_sample: int
    scored: list[PublicPmCalibrationResponseScoredItem]
    pending: list[PublicPmCalibrationResponsePendingItem]
    methodology: str | Unset = UNSET

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

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_calibration_response_pending_item import PublicPmCalibrationResponsePendingItem
        from ..models.public_pm_calibration_response_scored_item import PublicPmCalibrationResponseScoredItem

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

        public_pm_calibration_response = cls(
            lead_hours=lead_hours,
            min_sample=min_sample,
            scored=scored,
            pending=pending,
            methodology=methodology,
        )

        return public_pm_calibration_response
