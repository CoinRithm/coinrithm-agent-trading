from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_action_event import AgentActionEvent
    from ..models.agent_ledger_response_filters import AgentLedgerResponseFilters
    from ..models.agent_ledger_response_pagination import AgentLedgerResponsePagination


T = TypeVar("T", bound="AgentLedgerResponse")


@_attrs_define
class AgentLedgerResponse:
    """
    Attributes:
        data (list[AgentActionEvent] | Unset):
        pagination (AgentLedgerResponsePagination | Unset):
        filters (AgentLedgerResponseFilters | Unset):
        as_of (datetime.datetime | Unset):
    """

    data: list[AgentActionEvent] | Unset = UNSET
    pagination: AgentLedgerResponsePagination | Unset = UNSET
    filters: AgentLedgerResponseFilters | Unset = UNSET
    as_of: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        data: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.data, Unset):
            data = []
            for data_item_data in self.data:
                data_item = data_item_data.to_dict()
                data.append(data_item)

        pagination: dict[str, Any] | Unset = UNSET
        if not isinstance(self.pagination, Unset):
            pagination = self.pagination.to_dict()

        filters: dict[str, Any] | Unset = UNSET
        if not isinstance(self.filters, Unset):
            filters = self.filters.to_dict()

        as_of: str | Unset = UNSET
        if not isinstance(self.as_of, Unset):
            as_of = self.as_of.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if data is not UNSET:
            field_dict["data"] = data
        if pagination is not UNSET:
            field_dict["pagination"] = pagination
        if filters is not UNSET:
            field_dict["filters"] = filters
        if as_of is not UNSET:
            field_dict["asOf"] = as_of

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_action_event import AgentActionEvent
        from ..models.agent_ledger_response_filters import AgentLedgerResponseFilters
        from ..models.agent_ledger_response_pagination import AgentLedgerResponsePagination

        d = dict(src_dict)
        _data = d.pop("data", UNSET)
        data: list[AgentActionEvent] | Unset = UNSET
        if _data is not UNSET:
            data = []
            for data_item_data in _data:
                data_item = AgentActionEvent.from_dict(data_item_data)

                data.append(data_item)

        _pagination = d.pop("pagination", UNSET)
        pagination: AgentLedgerResponsePagination | Unset
        if isinstance(_pagination, Unset):
            pagination = UNSET
        else:
            pagination = AgentLedgerResponsePagination.from_dict(_pagination)

        _filters = d.pop("filters", UNSET)
        filters: AgentLedgerResponseFilters | Unset
        if isinstance(_filters, Unset):
            filters = UNSET
        else:
            filters = AgentLedgerResponseFilters.from_dict(_filters)

        _as_of = d.pop("asOf", UNSET)
        as_of: datetime.datetime | Unset
        if isinstance(_as_of, Unset):
            as_of = UNSET
        else:
            as_of = datetime.datetime.fromisoformat(_as_of)

        agent_ledger_response = cls(
            data=data,
            pagination=pagination,
            filters=filters,
            as_of=as_of,
        )

        agent_ledger_response.additional_properties = d
        return agent_ledger_response

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
