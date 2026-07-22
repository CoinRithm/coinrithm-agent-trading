from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.agent_run_outcome_summary_coverage import AgentRunOutcomeSummaryCoverage
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.agent_run_outcome_summary_by_venue import AgentRunOutcomeSummaryByVenue





T = TypeVar("T", bound="AgentRunOutcomeSummary")



@_attrs_define
class AgentRunOutcomeSummary:
    """ Best-effort run-level outcome/PnL attribution derived at export time
    from ledger relatedEntityType/relatedEntityId links. Spot orders may
    also match through their idempotency keys once a terminal ClosedOrder
    exists. No new data is stored for this summary.

        Attributes:
            schema (str | Unset):
            mode (str | Unset):
            coverage (AgentRunOutcomeSummaryCoverage | Unset):
            related_entity_count (int | Unset):
            matched_outcome_count (int | Unset):
            unmatched_related_entity_count (int | Unset):
            realized_pnl_musd (float | Unset):
            by_venue (AgentRunOutcomeSummaryByVenue | Unset):
            caveat (str | Unset):
     """

    schema: str | Unset = UNSET
    mode: str | Unset = UNSET
    coverage: AgentRunOutcomeSummaryCoverage | Unset = UNSET
    related_entity_count: int | Unset = UNSET
    matched_outcome_count: int | Unset = UNSET
    unmatched_related_entity_count: int | Unset = UNSET
    realized_pnl_musd: float | Unset = UNSET
    by_venue: AgentRunOutcomeSummaryByVenue | Unset = UNSET
    caveat: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.agent_run_outcome_summary_by_venue import AgentRunOutcomeSummaryByVenue
        schema = self.schema

        mode = self.mode

        coverage: str | Unset = UNSET
        if not isinstance(self.coverage, Unset):
            coverage = self.coverage.value


        related_entity_count = self.related_entity_count

        matched_outcome_count = self.matched_outcome_count

        unmatched_related_entity_count = self.unmatched_related_entity_count

        realized_pnl_musd = self.realized_pnl_musd

        by_venue: dict[str, Any] | Unset = UNSET
        if not isinstance(self.by_venue, Unset):
            by_venue = self.by_venue.to_dict()

        caveat = self.caveat


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if schema is not UNSET:
            field_dict["schema"] = schema
        if mode is not UNSET:
            field_dict["mode"] = mode
        if coverage is not UNSET:
            field_dict["coverage"] = coverage
        if related_entity_count is not UNSET:
            field_dict["relatedEntityCount"] = related_entity_count
        if matched_outcome_count is not UNSET:
            field_dict["matchedOutcomeCount"] = matched_outcome_count
        if unmatched_related_entity_count is not UNSET:
            field_dict["unmatchedRelatedEntityCount"] = unmatched_related_entity_count
        if realized_pnl_musd is not UNSET:
            field_dict["realizedPnlMusd"] = realized_pnl_musd
        if by_venue is not UNSET:
            field_dict["byVenue"] = by_venue
        if caveat is not UNSET:
            field_dict["caveat"] = caveat

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_run_outcome_summary_by_venue import AgentRunOutcomeSummaryByVenue
        d = dict(src_dict)
        schema = d.pop("schema", UNSET)

        mode = d.pop("mode", UNSET)

        _coverage = d.pop("coverage", UNSET)
        coverage: AgentRunOutcomeSummaryCoverage | Unset
        if isinstance(_coverage,  Unset):
            coverage = UNSET
        else:
            coverage = AgentRunOutcomeSummaryCoverage(_coverage)




        related_entity_count = d.pop("relatedEntityCount", UNSET)

        matched_outcome_count = d.pop("matchedOutcomeCount", UNSET)

        unmatched_related_entity_count = d.pop("unmatchedRelatedEntityCount", UNSET)

        realized_pnl_musd = d.pop("realizedPnlMusd", UNSET)

        _by_venue = d.pop("byVenue", UNSET)
        by_venue: AgentRunOutcomeSummaryByVenue | Unset
        if isinstance(_by_venue,  Unset):
            by_venue = UNSET
        else:
            by_venue = AgentRunOutcomeSummaryByVenue.from_dict(_by_venue)




        caveat = d.pop("caveat", UNSET)

        agent_run_outcome_summary = cls(
            schema=schema,
            mode=mode,
            coverage=coverage,
            related_entity_count=related_entity_count,
            matched_outcome_count=matched_outcome_count,
            unmatched_related_entity_count=unmatched_related_entity_count,
            realized_pnl_musd=realized_pnl_musd,
            by_venue=by_venue,
            caveat=caveat,
        )


        agent_run_outcome_summary.additional_properties = d
        return agent_run_outcome_summary

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
