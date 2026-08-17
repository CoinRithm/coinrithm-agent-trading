from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.open_order import OpenOrder


T = TypeVar("T", bound="ListOpenOrdersResponse200")


@_attrs_define
class ListOpenOrdersResponse200:
    """
    Attributes:
        coin_id (None | str | Unset): The filter that was applied; null when listing all coins.
        updated_since (datetime.datetime | None | Unset):
        as_of (datetime.datetime | Unset): Use as the next updatedSince cursor.
        rows (list[OpenOrder] | Unset):
    """

    coin_id: None | str | Unset = UNSET
    updated_since: datetime.datetime | None | Unset = UNSET
    as_of: datetime.datetime | Unset = UNSET
    rows: list[OpenOrder] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        coin_id: None | str | Unset
        if isinstance(self.coin_id, Unset):
            coin_id = UNSET
        else:
            coin_id = self.coin_id

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

        rows: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.rows, Unset):
            rows = []
            for rows_item_data in self.rows:
                rows_item = rows_item_data.to_dict()
                rows.append(rows_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if coin_id is not UNSET:
            field_dict["coinId"] = coin_id
        if updated_since is not UNSET:
            field_dict["updatedSince"] = updated_since
        if as_of is not UNSET:
            field_dict["asOf"] = as_of
        if rows is not UNSET:
            field_dict["rows"] = rows

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.open_order import OpenOrder

        d = dict(src_dict)

        def _parse_coin_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        coin_id = _parse_coin_id(d.pop("coinId", UNSET))

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

        _rows = d.pop("rows", UNSET)
        rows: list[OpenOrder] | Unset = UNSET
        if _rows is not UNSET:
            rows = []
            for rows_item_data in _rows:
                rows_item = OpenOrder.from_dict(rows_item_data)

                rows.append(rows_item)

        list_open_orders_response_200 = cls(
            coin_id=coin_id,
            updated_since=updated_since,
            as_of=as_of,
            rows=rows,
        )

        list_open_orders_response_200.additional_properties = d
        return list_open_orders_response_200

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
