from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_opportunity_response_opportunity_kind import PmOpportunityResponseOpportunityKind
from ..models.pm_opportunity_response_result import PmOpportunityResponseResult
from ..types import UNSET, Unset

T = TypeVar("T", bound="PmOpportunityResponse")


@_attrs_define
class PmOpportunityResponse:
    """
    Attributes:
        decision_uuid (UUID | Unset): Immutable artifact id — cite via /api/arena/decisions/{decisionUuid}.
        opportunity_kind (PmOpportunityResponseOpportunityKind | Unset):
        result (PmOpportunityResponseResult | Unset): Legacy lifecycle result derived from kind (abstained->abstained,
            forecast_only->quoted, quote_expired->rejected).
        idempotent_replay (bool | Unset): Present and true only when an existing (apiKey, decisionId) artifact was
            returned instead of a new insert.
    """

    decision_uuid: UUID | Unset = UNSET
    opportunity_kind: PmOpportunityResponseOpportunityKind | Unset = UNSET
    result: PmOpportunityResponseResult | Unset = UNSET
    idempotent_replay: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        decision_uuid: str | Unset = UNSET
        if not isinstance(self.decision_uuid, Unset):
            decision_uuid = str(self.decision_uuid)

        opportunity_kind: str | Unset = UNSET
        if not isinstance(self.opportunity_kind, Unset):
            opportunity_kind = self.opportunity_kind.value

        result: str | Unset = UNSET
        if not isinstance(self.result, Unset):
            result = self.result.value

        idempotent_replay = self.idempotent_replay

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if decision_uuid is not UNSET:
            field_dict["decisionUuid"] = decision_uuid
        if opportunity_kind is not UNSET:
            field_dict["opportunityKind"] = opportunity_kind
        if result is not UNSET:
            field_dict["result"] = result
        if idempotent_replay is not UNSET:
            field_dict["idempotentReplay"] = idempotent_replay

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        _decision_uuid = d.pop("decisionUuid", UNSET)
        decision_uuid: UUID | Unset
        if isinstance(_decision_uuid, Unset):
            decision_uuid = UNSET
        else:
            decision_uuid = UUID(_decision_uuid)

        _opportunity_kind = d.pop("opportunityKind", UNSET)
        opportunity_kind: PmOpportunityResponseOpportunityKind | Unset
        if isinstance(_opportunity_kind, Unset):
            opportunity_kind = UNSET
        else:
            opportunity_kind = PmOpportunityResponseOpportunityKind(_opportunity_kind)

        _result = d.pop("result", UNSET)
        result: PmOpportunityResponseResult | Unset
        if isinstance(_result, Unset):
            result = UNSET
        else:
            result = PmOpportunityResponseResult(_result)

        idempotent_replay = d.pop("idempotentReplay", UNSET)

        pm_opportunity_response = cls(
            decision_uuid=decision_uuid,
            opportunity_kind=opportunity_kind,
            result=result,
            idempotent_replay=idempotent_replay,
        )

        pm_opportunity_response.additional_properties = d
        return pm_opportunity_response

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
