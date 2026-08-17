from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="ScorecardRunContributionsSummaryExclusionReasons")


@_attrs_define
class ScorecardRunContributionsSummaryExclusionReasons:
    """Count of excluded decisions per reason.

    Attributes:
        unsettled (int | Unset):
        no_forecast (int | Unset):
        void (int | Unset):
        below_gate (int | Unset):
    """

    unsettled: int | Unset = UNSET
    no_forecast: int | Unset = UNSET
    void: int | Unset = UNSET
    below_gate: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        unsettled = self.unsettled

        no_forecast = self.no_forecast

        void = self.void

        below_gate = self.below_gate

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if unsettled is not UNSET:
            field_dict["unsettled"] = unsettled
        if no_forecast is not UNSET:
            field_dict["no_forecast"] = no_forecast
        if void is not UNSET:
            field_dict["void"] = void
        if below_gate is not UNSET:
            field_dict["below_gate"] = below_gate

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        unsettled = d.pop("unsettled", UNSET)

        no_forecast = d.pop("no_forecast", UNSET)

        void = d.pop("void", UNSET)

        below_gate = d.pop("below_gate", UNSET)

        scorecard_run_contributions_summary_exclusion_reasons = cls(
            unsettled=unsettled,
            no_forecast=no_forecast,
            void=void,
            below_gate=below_gate,
        )

        scorecard_run_contributions_summary_exclusion_reasons.additional_properties = d
        return scorecard_run_contributions_summary_exclusion_reasons

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
