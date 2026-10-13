from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="SpotReferenceResponseCoin")


@_attrs_define
class SpotReferenceResponseCoin:
    """
    Attributes:
        coin_id (str):
        symbol (str):
        name (str):
    """

    coin_id: str
    symbol: str
    name: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        coin_id = self.coin_id

        symbol = self.symbol

        name = self.name

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "coinId": coin_id,
                "symbol": symbol,
                "name": name,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        coin_id = d.pop("coinId")

        symbol = d.pop("symbol")

        name = d.pop("name")

        spot_reference_response_coin = cls(
            coin_id=coin_id,
            symbol=symbol,
            name=name,
        )

        spot_reference_response_coin.additional_properties = d
        return spot_reference_response_coin

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
