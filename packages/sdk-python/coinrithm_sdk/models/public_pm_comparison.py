from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_comparison_outcome import PublicPmComparisonOutcome
    from ..models.public_pm_comparison_summary import PublicPmComparisonSummary


T = TypeVar("T", bound="PublicPmComparison")


@_attrs_define
class PublicPmComparison:
    """One approved cross-source pair compared outcome by outcome. Every
    field is optional in this contract; absent fields mean an older
    server, never false or zero.

        Attributes:
            summary (PublicPmComparisonSummary | Unset):
            outcomes (list[PublicPmComparisonOutcome] | Unset):
            outcomes_total (int | Unset): Event detail only, unless `full=1`. Comparison rows before the default trimming to
                the shared outcomes (at most 60).
    """

    summary: PublicPmComparisonSummary | Unset = UNSET
    outcomes: list[PublicPmComparisonOutcome] | Unset = UNSET
    outcomes_total: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        summary: dict[str, Any] | Unset = UNSET
        if not isinstance(self.summary, Unset):
            summary = self.summary.to_dict()

        outcomes: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.outcomes, Unset):
            outcomes = []
            for outcomes_item_data in self.outcomes:
                outcomes_item = outcomes_item_data.to_dict()
                outcomes.append(outcomes_item)

        outcomes_total = self.outcomes_total

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if summary is not UNSET:
            field_dict["summary"] = summary
        if outcomes is not UNSET:
            field_dict["outcomes"] = outcomes
        if outcomes_total is not UNSET:
            field_dict["outcomesTotal"] = outcomes_total

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_comparison_outcome import PublicPmComparisonOutcome
        from ..models.public_pm_comparison_summary import PublicPmComparisonSummary

        d = dict(src_dict)
        _summary = d.pop("summary", UNSET)
        summary: PublicPmComparisonSummary | Unset
        if isinstance(_summary, Unset):
            summary = UNSET
        else:
            summary = PublicPmComparisonSummary.from_dict(_summary)

        _outcomes = d.pop("outcomes", UNSET)
        outcomes: list[PublicPmComparisonOutcome] | Unset = UNSET
        if _outcomes is not UNSET:
            outcomes = []
            for outcomes_item_data in _outcomes:
                outcomes_item = PublicPmComparisonOutcome.from_dict(outcomes_item_data)

                outcomes.append(outcomes_item)

        outcomes_total = d.pop("outcomesTotal", UNSET)

        public_pm_comparison = cls(
            summary=summary,
            outcomes=outcomes,
            outcomes_total=outcomes_total,
        )

        public_pm_comparison.additional_properties = d
        return public_pm_comparison

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
