from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmCalibrationResponseScoredItemExcluded")


@_attrs_define
class PublicPmCalibrationResponseScoredItemExcluded:
    """Cohort events NOT scored, by reason. Published so a consumer can see how much of a venue's corpus stands behind the
    number.

        Attributes:
            no_lead_point (int | Unset): No timeline point at or before resolvedAt - 24h.
            partial_book_at_lead (int | Unset): The t-24h snapshot held only part of the event's outcome set. Scoring those
                would condition inclusion on whether the eventual winner happened to be captured.
            winner_not_an_outcome (int | Unset): Complete book, but the declared winner is not one of the event's outcomes —
                a resolution-provenance defect.
    """

    no_lead_point: int | Unset = UNSET
    partial_book_at_lead: int | Unset = UNSET
    winner_not_an_outcome: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        no_lead_point = self.no_lead_point

        partial_book_at_lead = self.partial_book_at_lead

        winner_not_an_outcome = self.winner_not_an_outcome

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if no_lead_point is not UNSET:
            field_dict["noLeadPoint"] = no_lead_point
        if partial_book_at_lead is not UNSET:
            field_dict["partialBookAtLead"] = partial_book_at_lead
        if winner_not_an_outcome is not UNSET:
            field_dict["winnerNotAnOutcome"] = winner_not_an_outcome

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        no_lead_point = d.pop("noLeadPoint", UNSET)

        partial_book_at_lead = d.pop("partialBookAtLead", UNSET)

        winner_not_an_outcome = d.pop("winnerNotAnOutcome", UNSET)

        public_pm_calibration_response_scored_item_excluded = cls(
            no_lead_point=no_lead_point,
            partial_book_at_lead=partial_book_at_lead,
            winner_not_an_outcome=winner_not_an_outcome,
        )

        public_pm_calibration_response_scored_item_excluded.additional_properties = d
        return public_pm_calibration_response_scored_item_excluded

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
