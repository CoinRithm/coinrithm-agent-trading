from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="GetArenaDecisionsResponse200Pagination")


@_attrs_define
class GetArenaDecisionsResponse200Pagination:
    """
    Attributes:
        limit (int):
        cursor (None | str):
        next_cursor (None | str):
        has_more (bool):
        decisions_has_more (bool):
        opportunities_has_more (bool | Unset): Present when includeOpportunities=true.
    """

    limit: int
    cursor: None | str
    next_cursor: None | str
    has_more: bool
    decisions_has_more: bool
    opportunities_has_more: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        limit = self.limit

        cursor: None | str
        cursor = self.cursor

        next_cursor: None | str
        next_cursor = self.next_cursor

        has_more = self.has_more

        decisions_has_more = self.decisions_has_more

        opportunities_has_more = self.opportunities_has_more

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "limit": limit,
                "cursor": cursor,
                "nextCursor": next_cursor,
                "hasMore": has_more,
                "decisionsHasMore": decisions_has_more,
            }
        )
        if opportunities_has_more is not UNSET:
            field_dict["opportunitiesHasMore"] = opportunities_has_more

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        limit = d.pop("limit")

        def _parse_cursor(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        cursor = _parse_cursor(d.pop("cursor"))

        def _parse_next_cursor(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        next_cursor = _parse_next_cursor(d.pop("nextCursor"))

        has_more = d.pop("hasMore")

        decisions_has_more = d.pop("decisionsHasMore")

        opportunities_has_more = d.pop("opportunitiesHasMore", UNSET)

        get_arena_decisions_response_200_pagination = cls(
            limit=limit,
            cursor=cursor,
            next_cursor=next_cursor,
            has_more=has_more,
            decisions_has_more=decisions_has_more,
            opportunities_has_more=opportunities_has_more,
        )

        get_arena_decisions_response_200_pagination.additional_properties = d
        return get_arena_decisions_response_200_pagination

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
