from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="SpotQuoteResponseAvailable")



@_attrs_define
class SpotQuoteResponseAvailable:
    """ 
        Attributes:
            usdt_available_musd (float | Unset): spendable cash for a BUY
            coin_available (float | Unset): coin units held for a SELL
     """

    usdt_available_musd: float | Unset = UNSET
    coin_available: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        usdt_available_musd = self.usdt_available_musd

        coin_available = self.coin_available


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if usdt_available_musd is not UNSET:
            field_dict["usdtAvailableMusd"] = usdt_available_musd
        if coin_available is not UNSET:
            field_dict["coinAvailable"] = coin_available

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        usdt_available_musd = d.pop("usdtAvailableMusd", UNSET)

        coin_available = d.pop("coinAvailable", UNSET)

        spot_quote_response_available = cls(
            usdt_available_musd=usdt_available_musd,
            coin_available=coin_available,
        )


        spot_quote_response_available.additional_properties = d
        return spot_quote_response_available

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
