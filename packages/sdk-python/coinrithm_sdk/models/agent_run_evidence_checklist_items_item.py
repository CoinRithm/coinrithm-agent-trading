from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.agent_run_evidence_checklist_items_item_status import AgentRunEvidenceChecklistItemsItemStatus
from ..types import UNSET, Unset

T = TypeVar("T", bound="AgentRunEvidenceChecklistItemsItem")


@_attrs_define
class AgentRunEvidenceChecklistItemsItem:
    """
    Attributes:
        id (str | Unset):
        label (str | Unset):
        status (AgentRunEvidenceChecklistItemsItemStatus | Unset):
        detail (str | Unset):
    """

    id: str | Unset = UNSET
    label: str | Unset = UNSET
    status: AgentRunEvidenceChecklistItemsItemStatus | Unset = UNSET
    detail: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        label = self.label

        status: str | Unset = UNSET
        if not isinstance(self.status, Unset):
            status = self.status.value

        detail = self.detail

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if id is not UNSET:
            field_dict["id"] = id
        if label is not UNSET:
            field_dict["label"] = label
        if status is not UNSET:
            field_dict["status"] = status
        if detail is not UNSET:
            field_dict["detail"] = detail

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id", UNSET)

        label = d.pop("label", UNSET)

        _status = d.pop("status", UNSET)
        status: AgentRunEvidenceChecklistItemsItemStatus | Unset
        if isinstance(_status, Unset):
            status = UNSET
        else:
            status = AgentRunEvidenceChecklistItemsItemStatus(_status)

        detail = d.pop("detail", UNSET)

        agent_run_evidence_checklist_items_item = cls(
            id=id,
            label=label,
            status=status,
            detail=detail,
        )

        agent_run_evidence_checklist_items_item.additional_properties = d
        return agent_run_evidence_checklist_items_item

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
