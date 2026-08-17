from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="AgentLedgerResponsePagination")


@_attrs_define
class AgentLedgerResponsePagination:
    """
    Attributes:
        limit (int | Unset):
        offset (int | Unset):
        has_more (bool | Unset):
        total (int | Unset):
    """

    limit: int | Unset = UNSET
    offset: int | Unset = UNSET
    has_more: bool | Unset = UNSET
    total: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        limit = self.limit

        offset = self.offset

        has_more = self.has_more

        total = self.total

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if limit is not UNSET:
            field_dict["limit"] = limit
        if offset is not UNSET:
            field_dict["offset"] = offset
        if has_more is not UNSET:
            field_dict["hasMore"] = has_more
        if total is not UNSET:
            field_dict["total"] = total

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        limit = d.pop("limit", UNSET)

        offset = d.pop("offset", UNSET)

        has_more = d.pop("hasMore", UNSET)

        total = d.pop("total", UNSET)

        agent_ledger_response_pagination = cls(
            limit=limit,
            offset=offset,
            has_more=has_more,
            total=total,
        )

        agent_ledger_response_pagination.additional_properties = d
        return agent_ledger_response_pagination

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
