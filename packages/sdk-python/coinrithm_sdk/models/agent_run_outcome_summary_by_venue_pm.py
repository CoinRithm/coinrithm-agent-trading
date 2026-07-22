from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="AgentRunOutcomeSummaryByVenuePm")



@_attrs_define
class AgentRunOutcomeSummaryByVenuePm:
    """ 
        Attributes:
            realized_pnl_musd (float | Unset):
            matched_outcome_count (int | Unset):
     """

    realized_pnl_musd: float | Unset = UNSET
    matched_outcome_count: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        realized_pnl_musd = self.realized_pnl_musd

        matched_outcome_count = self.matched_outcome_count


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if realized_pnl_musd is not UNSET:
            field_dict["realizedPnlMusd"] = realized_pnl_musd
        if matched_outcome_count is not UNSET:
            field_dict["matchedOutcomeCount"] = matched_outcome_count

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        realized_pnl_musd = d.pop("realizedPnlMusd", UNSET)

        matched_outcome_count = d.pop("matchedOutcomeCount", UNSET)

        agent_run_outcome_summary_by_venue_pm = cls(
            realized_pnl_musd=realized_pnl_musd,
            matched_outcome_count=matched_outcome_count,
        )


        agent_run_outcome_summary_by_venue_pm.additional_properties = d
        return agent_run_outcome_summary_by_venue_pm

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
