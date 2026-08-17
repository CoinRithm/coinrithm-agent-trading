from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.futures_position import FuturesPosition


T = TypeVar("T", bound="GetFuturesPositionsResponse200")


@_attrs_define
class GetFuturesPositionsResponse200:
    """
    Attributes:
        positions (list[FuturesPosition] | Unset):
        updated_since (datetime.datetime | None | Unset):
        as_of (datetime.datetime | Unset):
    """

    positions: list[FuturesPosition] | Unset = UNSET
    updated_since: datetime.datetime | None | Unset = UNSET
    as_of: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        positions: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.positions, Unset):
            positions = []
            for positions_item_data in self.positions:
                positions_item = positions_item_data.to_dict()
                positions.append(positions_item)

        updated_since: None | str | Unset
        if isinstance(self.updated_since, Unset):
            updated_since = UNSET
        elif isinstance(self.updated_since, datetime.datetime):
            updated_since = self.updated_since.isoformat()
        else:
            updated_since = self.updated_since

        as_of: str | Unset = UNSET
        if not isinstance(self.as_of, Unset):
            as_of = self.as_of.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if positions is not UNSET:
            field_dict["positions"] = positions
        if updated_since is not UNSET:
            field_dict["updatedSince"] = updated_since
        if as_of is not UNSET:
            field_dict["asOf"] = as_of

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.futures_position import FuturesPosition

        d = dict(src_dict)
        _positions = d.pop("positions", UNSET)
        positions: list[FuturesPosition] | Unset = UNSET
        if _positions is not UNSET:
            positions = []
            for positions_item_data in _positions:
                positions_item = FuturesPosition.from_dict(positions_item_data)

                positions.append(positions_item)

        def _parse_updated_since(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                updated_since_type_0 = datetime.datetime.fromisoformat(data)

                return updated_since_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        updated_since = _parse_updated_since(d.pop("updatedSince", UNSET))

        _as_of = d.pop("asOf", UNSET)
        as_of: datetime.datetime | Unset
        if isinstance(_as_of, Unset):
            as_of = UNSET
        else:
            as_of = datetime.datetime.fromisoformat(_as_of)

        get_futures_positions_response_200 = cls(
            positions=positions,
            updated_since=updated_since,
            as_of=as_of,
        )

        get_futures_positions_response_200.additional_properties = d
        return get_futures_positions_response_200

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
