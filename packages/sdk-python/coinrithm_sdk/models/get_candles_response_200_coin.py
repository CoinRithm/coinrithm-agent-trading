from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="GetCandlesResponse200Coin")



@_attrs_define
class GetCandlesResponse200Coin:
    """ 
        Attributes:
            ucid (str | Unset):
            slug (str | Unset):
            symbol (str | Unset):
            name (str | Unset):
     """

    ucid: str | Unset = UNSET
    slug: str | Unset = UNSET
    symbol: str | Unset = UNSET
    name: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        ucid = self.ucid

        slug = self.slug

        symbol = self.symbol

        name = self.name


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if ucid is not UNSET:
            field_dict["ucid"] = ucid
        if slug is not UNSET:
            field_dict["slug"] = slug
        if symbol is not UNSET:
            field_dict["symbol"] = symbol
        if name is not UNSET:
            field_dict["name"] = name

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        ucid = d.pop("ucid", UNSET)

        slug = d.pop("slug", UNSET)

        symbol = d.pop("symbol", UNSET)

        name = d.pop("name", UNSET)

        get_candles_response_200_coin = cls(
            ucid=ucid,
            slug=slug,
            symbol=symbol,
            name=name,
        )


        get_candles_response_200_coin.additional_properties = d
        return get_candles_response_200_coin

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
