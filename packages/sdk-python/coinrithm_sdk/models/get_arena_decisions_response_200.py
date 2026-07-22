from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.arena_decision import ArenaDecision
  from ..models.arena_opportunity import ArenaOpportunity
  from ..models.get_arena_decisions_response_200_pagination import GetArenaDecisionsResponse200Pagination





T = TypeVar("T", bound="GetArenaDecisionsResponse200")



@_attrs_define
class GetArenaDecisionsResponse200:
    """ 
        Attributes:
            schema (str | Unset): v1 schema marker — unchanged for existing consumers. Example: coinrithm.agentDecisions.v1.
            dataset_version (str | Unset): v2 dataset marker (additive). v2 = every v1 field, unchanged, PLUS the per-
                decision immutable-artifact fields and, behind ?includeOpportunities=true, the non-opened opportunities array.
                Example: coinrithm.agentDecisions.v2.
            description (str | Unset):
            execution_policy_version (str | Unset): Versioned paper-execution policy every fill in this dataset ran under
                (fees/spread/slippage; never costless). pnlMusd is net of these modeled costs. Example: paper_execution_v1.
            evaluation_policy_version (str | Unset): Versioned evaluation policy these decisions are scored under. Example:
                eval-1.
            count (int | Unset): Total matching resolved decisions across all cursor pages.
            decisions (list[ArenaDecision] | Unset):
            opportunities (list[ArenaOpportunity] | Unset): NON-opened opportunities — present ONLY when
                ?includeOpportunities=true. A distinct record type (no fill, no settlement), so fill-only fields are honestly
                absent.
            opportunity_count (int | Unset): Total matching opportunities across all cursor pages (present only with
                ?includeOpportunities=true).
            pagination (GetArenaDecisionsResponse200Pagination | Unset):
     """

    schema: str | Unset = UNSET
    dataset_version: str | Unset = UNSET
    description: str | Unset = UNSET
    execution_policy_version: str | Unset = UNSET
    evaluation_policy_version: str | Unset = UNSET
    count: int | Unset = UNSET
    decisions: list[ArenaDecision] | Unset = UNSET
    opportunities: list[ArenaOpportunity] | Unset = UNSET
    opportunity_count: int | Unset = UNSET
    pagination: GetArenaDecisionsResponse200Pagination | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.arena_decision import ArenaDecision
        from ..models.arena_opportunity import ArenaOpportunity
        from ..models.get_arena_decisions_response_200_pagination import GetArenaDecisionsResponse200Pagination
        schema = self.schema

        dataset_version = self.dataset_version

        description = self.description

        execution_policy_version = self.execution_policy_version

        evaluation_policy_version = self.evaluation_policy_version

        count = self.count

        decisions: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.decisions, Unset):
            decisions = []
            for decisions_item_data in self.decisions:
                decisions_item = decisions_item_data.to_dict()
                decisions.append(decisions_item)



        opportunities: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.opportunities, Unset):
            opportunities = []
            for opportunities_item_data in self.opportunities:
                opportunities_item = opportunities_item_data.to_dict()
                opportunities.append(opportunities_item)



        opportunity_count = self.opportunity_count

        pagination: dict[str, Any] | Unset = UNSET
        if not isinstance(self.pagination, Unset):
            pagination = self.pagination.to_dict()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if schema is not UNSET:
            field_dict["schema"] = schema
        if dataset_version is not UNSET:
            field_dict["datasetVersion"] = dataset_version
        if description is not UNSET:
            field_dict["description"] = description
        if execution_policy_version is not UNSET:
            field_dict["executionPolicyVersion"] = execution_policy_version
        if evaluation_policy_version is not UNSET:
            field_dict["evaluationPolicyVersion"] = evaluation_policy_version
        if count is not UNSET:
            field_dict["count"] = count
        if decisions is not UNSET:
            field_dict["decisions"] = decisions
        if opportunities is not UNSET:
            field_dict["opportunities"] = opportunities
        if opportunity_count is not UNSET:
            field_dict["opportunityCount"] = opportunity_count
        if pagination is not UNSET:
            field_dict["pagination"] = pagination

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.arena_decision import ArenaDecision
        from ..models.arena_opportunity import ArenaOpportunity
        from ..models.get_arena_decisions_response_200_pagination import GetArenaDecisionsResponse200Pagination
        d = dict(src_dict)
        schema = d.pop("schema", UNSET)

        dataset_version = d.pop("datasetVersion", UNSET)

        description = d.pop("description", UNSET)

        execution_policy_version = d.pop("executionPolicyVersion", UNSET)

        evaluation_policy_version = d.pop("evaluationPolicyVersion", UNSET)

        count = d.pop("count", UNSET)

        _decisions = d.pop("decisions", UNSET)
        decisions: list[ArenaDecision] | Unset = UNSET
        if _decisions is not UNSET:
            decisions = []
            for decisions_item_data in _decisions:
                decisions_item = ArenaDecision.from_dict(decisions_item_data)



                decisions.append(decisions_item)


        _opportunities = d.pop("opportunities", UNSET)
        opportunities: list[ArenaOpportunity] | Unset = UNSET
        if _opportunities is not UNSET:
            opportunities = []
            for opportunities_item_data in _opportunities:
                opportunities_item = ArenaOpportunity.from_dict(opportunities_item_data)



                opportunities.append(opportunities_item)


        opportunity_count = d.pop("opportunityCount", UNSET)

        _pagination = d.pop("pagination", UNSET)
        pagination: GetArenaDecisionsResponse200Pagination | Unset
        if isinstance(_pagination,  Unset):
            pagination = UNSET
        else:
            pagination = GetArenaDecisionsResponse200Pagination.from_dict(_pagination)




        get_arena_decisions_response_200 = cls(
            schema=schema,
            dataset_version=dataset_version,
            description=description,
            execution_policy_version=execution_policy_version,
            evaluation_policy_version=evaluation_policy_version,
            count=count,
            decisions=decisions,
            opportunities=opportunities,
            opportunity_count=opportunity_count,
            pagination=pagination,
        )


        get_arena_decisions_response_200.additional_properties = d
        return get_arena_decisions_response_200

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
