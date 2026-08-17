from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_audit_stats import AgentAuditStats
    from ..models.agent_evaluation_stats import AgentEvaluationStats
    from ..models.agent_venue_perf import AgentVenuePerf
    from ..models.get_performance_response_200_by_venue import GetPerformanceResponse200ByVenue


T = TypeVar("T", bound="GetPerformanceResponse200")


@_attrs_define
class GetPerformanceResponse200:
    """
    Attributes:
        api_key_id (int | Unset):
        totals (AgentVenuePerf | Unset):
        by_venue (GetPerformanceResponse200ByVenue | Unset):
        evaluation (AgentEvaluationStats | Unset):
        audit_stats (AgentAuditStats | Unset):
        as_of (datetime.datetime | Unset):
    """

    api_key_id: int | Unset = UNSET
    totals: AgentVenuePerf | Unset = UNSET
    by_venue: GetPerformanceResponse200ByVenue | Unset = UNSET
    evaluation: AgentEvaluationStats | Unset = UNSET
    audit_stats: AgentAuditStats | Unset = UNSET
    as_of: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        api_key_id = self.api_key_id

        totals: dict[str, Any] | Unset = UNSET
        if not isinstance(self.totals, Unset):
            totals = self.totals.to_dict()

        by_venue: dict[str, Any] | Unset = UNSET
        if not isinstance(self.by_venue, Unset):
            by_venue = self.by_venue.to_dict()

        evaluation: dict[str, Any] | Unset = UNSET
        if not isinstance(self.evaluation, Unset):
            evaluation = self.evaluation.to_dict()

        audit_stats: dict[str, Any] | Unset = UNSET
        if not isinstance(self.audit_stats, Unset):
            audit_stats = self.audit_stats.to_dict()

        as_of: str | Unset = UNSET
        if not isinstance(self.as_of, Unset):
            as_of = self.as_of.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if api_key_id is not UNSET:
            field_dict["apiKeyId"] = api_key_id
        if totals is not UNSET:
            field_dict["totals"] = totals
        if by_venue is not UNSET:
            field_dict["byVenue"] = by_venue
        if evaluation is not UNSET:
            field_dict["evaluation"] = evaluation
        if audit_stats is not UNSET:
            field_dict["auditStats"] = audit_stats
        if as_of is not UNSET:
            field_dict["asOf"] = as_of

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_audit_stats import AgentAuditStats
        from ..models.agent_evaluation_stats import AgentEvaluationStats
        from ..models.agent_venue_perf import AgentVenuePerf
        from ..models.get_performance_response_200_by_venue import GetPerformanceResponse200ByVenue

        d = dict(src_dict)
        api_key_id = d.pop("apiKeyId", UNSET)

        _totals = d.pop("totals", UNSET)
        totals: AgentVenuePerf | Unset
        if isinstance(_totals, Unset):
            totals = UNSET
        else:
            totals = AgentVenuePerf.from_dict(_totals)

        _by_venue = d.pop("byVenue", UNSET)
        by_venue: GetPerformanceResponse200ByVenue | Unset
        if isinstance(_by_venue, Unset):
            by_venue = UNSET
        else:
            by_venue = GetPerformanceResponse200ByVenue.from_dict(_by_venue)

        _evaluation = d.pop("evaluation", UNSET)
        evaluation: AgentEvaluationStats | Unset
        if isinstance(_evaluation, Unset):
            evaluation = UNSET
        else:
            evaluation = AgentEvaluationStats.from_dict(_evaluation)

        _audit_stats = d.pop("auditStats", UNSET)
        audit_stats: AgentAuditStats | Unset
        if isinstance(_audit_stats, Unset):
            audit_stats = UNSET
        else:
            audit_stats = AgentAuditStats.from_dict(_audit_stats)

        _as_of = d.pop("asOf", UNSET)
        as_of: datetime.datetime | Unset
        if isinstance(_as_of, Unset):
            as_of = UNSET
        else:
            as_of = datetime.datetime.fromisoformat(_as_of)

        get_performance_response_200 = cls(
            api_key_id=api_key_id,
            totals=totals,
            by_venue=by_venue,
            evaluation=evaluation,
            audit_stats=audit_stats,
            as_of=as_of,
        )

        get_performance_response_200.additional_properties = d
        return get_performance_response_200

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
