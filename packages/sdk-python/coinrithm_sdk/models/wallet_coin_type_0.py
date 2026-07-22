from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="WalletCoinType0")



@_attrs_define
class WalletCoinType0:
    """ Present only when ?coinId was supplied.

        Attributes:
            coin_id (str | Unset):
            available (float | Unset):
            frozen (float | Unset):
            avg_cost_usd (float | Unset):
     """

    coin_id: str | Unset = UNSET
    available: float | Unset = UNSET
    frozen: float | Unset = UNSET
    avg_cost_usd: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        coin_id = self.coin_id

        available = self.available

        frozen = self.frozen

        avg_cost_usd = self.avg_cost_usd


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if coin_id is not UNSET:
            field_dict["coinId"] = coin_id
        if available is not UNSET:
            field_dict["available"] = available
        if frozen is not UNSET:
            field_dict["frozen"] = frozen
        if avg_cost_usd is not UNSET:
            field_dict["avgCostUsd"] = avg_cost_usd

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        coin_id = d.pop("coinId", UNSET)

        available = d.pop("available", UNSET)

        frozen = d.pop("frozen", UNSET)

        avg_cost_usd = d.pop("avgCostUsd", UNSET)

        wallet_coin_type_0 = cls(
            coin_id=coin_id,
            available=available,
            frozen=frozen,
            avg_cost_usd=avg_cost_usd,
        )


        wallet_coin_type_0.additional_properties = d
        return wallet_coin_type_0

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
