from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.pm_paper_v2_discovery_response_meta_bounded_selection_excluded import (
        PmPaperV2DiscoveryResponseMetaBoundedSelectionExcluded,
    )


T = TypeVar("T", bound="PmPaperV2DiscoveryResponseMetaBoundedSelection")


@_attrs_define
class PmPaperV2DiscoveryResponseMetaBoundedSelection:
    """
    Attributes:
        requested_event_limit (int):
        events_before (int):
        outcomes_before (int):
        events_after (int):
        outcomes_after (int):
        excluded (PmPaperV2DiscoveryResponseMetaBoundedSelectionExcluded): Outcomes removed, counted by reason:
            `native_identity_unavailable`, `unsupported_terminal_contract`,
            `native_maturity_unknown`, `native_maturity_expired`,
            `native_maturity_beyond_horizon`.
        all_market_coverage (bool): The list is a bounded sample, not every eligible market.
    """

    requested_event_limit: int
    events_before: int
    outcomes_before: int
    events_after: int
    outcomes_after: int
    excluded: PmPaperV2DiscoveryResponseMetaBoundedSelectionExcluded
    all_market_coverage: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        requested_event_limit = self.requested_event_limit

        events_before = self.events_before

        outcomes_before = self.outcomes_before

        events_after = self.events_after

        outcomes_after = self.outcomes_after

        excluded = self.excluded.to_dict()

        all_market_coverage = self.all_market_coverage

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "requestedEventLimit": requested_event_limit,
                "eventsBefore": events_before,
                "outcomesBefore": outcomes_before,
                "eventsAfter": events_after,
                "outcomesAfter": outcomes_after,
                "excluded": excluded,
                "allMarketCoverage": all_market_coverage,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.pm_paper_v2_discovery_response_meta_bounded_selection_excluded import (
            PmPaperV2DiscoveryResponseMetaBoundedSelectionExcluded,
        )

        d = dict(src_dict)
        requested_event_limit = d.pop("requestedEventLimit")

        events_before = d.pop("eventsBefore")

        outcomes_before = d.pop("outcomesBefore")

        events_after = d.pop("eventsAfter")

        outcomes_after = d.pop("outcomesAfter")

        excluded = PmPaperV2DiscoveryResponseMetaBoundedSelectionExcluded.from_dict(d.pop("excluded"))

        all_market_coverage = d.pop("allMarketCoverage")

        pm_paper_v2_discovery_response_meta_bounded_selection = cls(
            requested_event_limit=requested_event_limit,
            events_before=events_before,
            outcomes_before=outcomes_before,
            events_after=events_after,
            outcomes_after=outcomes_after,
            excluded=excluded,
            all_market_coverage=all_market_coverage,
        )

        pm_paper_v2_discovery_response_meta_bounded_selection.additional_properties = d
        return pm_paper_v2_discovery_response_meta_bounded_selection

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
