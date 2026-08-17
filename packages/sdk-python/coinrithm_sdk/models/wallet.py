from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.wallet_coin_type_0 import WalletCoinType0
    from ..models.wallet_usdt import WalletUsdt


T = TypeVar("T", bound="Wallet")


@_attrs_define
class Wallet:
    """
    Attributes:
        wallet_id (int | Unset):
        usdt (WalletUsdt | Unset): Cash (coinId 825). Frozen partitions are mutually exclusive buckets.
        coin (None | Unset | WalletCoinType0): Present only when ?coinId was supplied.
    """

    wallet_id: int | Unset = UNSET
    usdt: WalletUsdt | Unset = UNSET
    coin: None | Unset | WalletCoinType0 = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.wallet_coin_type_0 import WalletCoinType0

        wallet_id = self.wallet_id

        usdt: dict[str, Any] | Unset = UNSET
        if not isinstance(self.usdt, Unset):
            usdt = self.usdt.to_dict()

        coin: dict[str, Any] | None | Unset
        if isinstance(self.coin, Unset):
            coin = UNSET
        elif isinstance(self.coin, WalletCoinType0):
            coin = self.coin.to_dict()
        else:
            coin = self.coin

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if wallet_id is not UNSET:
            field_dict["walletId"] = wallet_id
        if usdt is not UNSET:
            field_dict["usdt"] = usdt
        if coin is not UNSET:
            field_dict["coin"] = coin

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.wallet_coin_type_0 import WalletCoinType0
        from ..models.wallet_usdt import WalletUsdt

        d = dict(src_dict)
        wallet_id = d.pop("walletId", UNSET)

        _usdt = d.pop("usdt", UNSET)
        usdt: WalletUsdt | Unset
        if isinstance(_usdt, Unset):
            usdt = UNSET
        else:
            usdt = WalletUsdt.from_dict(_usdt)

        def _parse_coin(data: object) -> None | Unset | WalletCoinType0:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                coin_type_0 = WalletCoinType0.from_dict(data)

                return coin_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | WalletCoinType0, data)

        coin = _parse_coin(d.pop("coin", UNSET))

        wallet = cls(
            wallet_id=wallet_id,
            usdt=usdt,
            coin=coin,
        )

        wallet.additional_properties = d
        return wallet

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
