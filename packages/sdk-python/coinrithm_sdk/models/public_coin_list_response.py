from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_coin_list_item import PublicCoinListItem


T = TypeVar("T", bound="PublicCoinListResponse")


@_attrs_define
class PublicCoinListResponse:
    """
    Attributes:
        data (list[PublicCoinListItem]):
        total_rows (int): Every coin in the directory, active or not (1,704 on 2026-10-16).
    """

    data: list[PublicCoinListItem]
    total_rows: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        data = []
        for data_item_data in self.data:
            data_item = data_item_data.to_dict()
            data.append(data_item)

        total_rows = self.total_rows

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "data": data,
                "totalRows": total_rows,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_coin_list_item import PublicCoinListItem

        d = dict(src_dict)
        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = PublicCoinListItem.from_dict(data_item_data)

            data.append(data_item)

        total_rows = d.pop("totalRows")

        public_coin_list_response = cls(
            data=data,
            total_rows=total_rows,
        )

        public_coin_list_response.additional_properties = d
        return public_coin_list_response

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
