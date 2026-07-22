from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import Literal, cast






T = TypeVar("T", bound="WalletUsdt")



@_attrs_define
class WalletUsdt:
    """ Cash (coinId 825). Frozen partitions are mutually exclusive buckets.

        Attributes:
            coin_id (Literal['825'] | Unset):
            available (float | Unset): spendable cash
            frozen (float | Unset): reserved by open spot orders
            frozen_pm (float | Unset): reserved by open PM positions
            frozen_futures (float | Unset): reserved as futures margin
            avg_cost_usd (float | Unset):
     """

    coin_id: Literal['825'] | Unset = UNSET
    available: float | Unset = UNSET
    frozen: float | Unset = UNSET
    frozen_pm: float | Unset = UNSET
    frozen_futures: float | Unset = UNSET
    avg_cost_usd: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        coin_id = self.coin_id

        available = self.available

        frozen = self.frozen

        frozen_pm = self.frozen_pm

        frozen_futures = self.frozen_futures

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
        if frozen_pm is not UNSET:
            field_dict["frozenPm"] = frozen_pm
        if frozen_futures is not UNSET:
            field_dict["frozenFutures"] = frozen_futures
        if avg_cost_usd is not UNSET:
            field_dict["avgCostUsd"] = avg_cost_usd

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        coin_id = cast(Literal['825'] | Unset , d.pop("coinId", UNSET))
        if coin_id != '825'and not isinstance(coin_id, Unset):
            raise ValueError(f"coinId must match const '825', got '{coin_id}'")

        available = d.pop("available", UNSET)

        frozen = d.pop("frozen", UNSET)

        frozen_pm = d.pop("frozenPm", UNSET)

        frozen_futures = d.pop("frozenFutures", UNSET)

        avg_cost_usd = d.pop("avgCostUsd", UNSET)

        wallet_usdt = cls(
            coin_id=coin_id,
            available=available,
            frozen=frozen,
            frozen_pm=frozen_pm,
            frozen_futures=frozen_futures,
            avg_cost_usd=avg_cost_usd,
        )


        wallet_usdt.additional_properties = d
        return wallet_usdt

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
