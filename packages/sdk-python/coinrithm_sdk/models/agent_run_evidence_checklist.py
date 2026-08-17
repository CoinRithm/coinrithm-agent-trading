from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.agent_run_evidence_checklist_overall_status import AgentRunEvidenceChecklistOverallStatus
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_run_evidence_checklist_items_item import AgentRunEvidenceChecklistItemsItem


T = TypeVar("T", bound="AgentRunEvidenceChecklist")


@_attrs_define
class AgentRunEvidenceChecklist:
    """Derived private reproducibility checklist for a run export. Computed
    from ledger rows at read/export time; no additional run table or raw
    market archive is created.

        Attributes:
            schema (str | Unset):
            overall_status (AgentRunEvidenceChecklistOverallStatus | Unset):
            items (list[AgentRunEvidenceChecklistItemsItem] | Unset):
    """

    schema: str | Unset = UNSET
    overall_status: AgentRunEvidenceChecklistOverallStatus | Unset = UNSET
    items: list[AgentRunEvidenceChecklistItemsItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        schema = self.schema

        overall_status: str | Unset = UNSET
        if not isinstance(self.overall_status, Unset):
            overall_status = self.overall_status.value

        items: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.items, Unset):
            items = []
            for items_item_data in self.items:
                items_item = items_item_data.to_dict()
                items.append(items_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if schema is not UNSET:
            field_dict["schema"] = schema
        if overall_status is not UNSET:
            field_dict["overallStatus"] = overall_status
        if items is not UNSET:
            field_dict["items"] = items

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_run_evidence_checklist_items_item import AgentRunEvidenceChecklistItemsItem

        d = dict(src_dict)
        schema = d.pop("schema", UNSET)

        _overall_status = d.pop("overallStatus", UNSET)
        overall_status: AgentRunEvidenceChecklistOverallStatus | Unset
        if isinstance(_overall_status, Unset):
            overall_status = UNSET
        else:
            overall_status = AgentRunEvidenceChecklistOverallStatus(_overall_status)

        _items = d.pop("items", UNSET)
        items: list[AgentRunEvidenceChecklistItemsItem] | Unset = UNSET
        if _items is not UNSET:
            items = []
            for items_item_data in _items:
                items_item = AgentRunEvidenceChecklistItemsItem.from_dict(items_item_data)

                items.append(items_item)

        agent_run_evidence_checklist = cls(
            schema=schema,
            overall_status=overall_status,
            items=items,
        )

        agent_run_evidence_checklist.additional_properties = d
        return agent_run_evidence_checklist

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
