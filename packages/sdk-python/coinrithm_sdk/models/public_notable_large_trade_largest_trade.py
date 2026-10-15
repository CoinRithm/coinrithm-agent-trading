from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicNotableLargeTradeLargestTrade")


@_attrs_define
class PublicNotableLargeTradeLargestTrade:
    """
    Attributes:
        trade_id (str):
        notional_usd (float):
        price (float):
        qty (float):
        trade_time (datetime.datetime):
    """

    trade_id: str
    notional_usd: float
    price: float
    qty: float
    trade_time: datetime.datetime
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        trade_id = self.trade_id

        notional_usd = self.notional_usd

        price = self.price

        qty = self.qty

        trade_time = self.trade_time.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "tradeId": trade_id,
                "notionalUsd": notional_usd,
                "price": price,
                "qty": qty,
                "tradeTime": trade_time,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        trade_id = d.pop("tradeId")

        notional_usd = d.pop("notionalUsd")

        price = d.pop("price")

        qty = d.pop("qty")

        trade_time = datetime.datetime.fromisoformat(d.pop("tradeTime").replace("Z", "+00:00"))

        public_notable_large_trade_largest_trade = cls(
            trade_id=trade_id,
            notional_usd=notional_usd,
            price=price,
            qty=qty,
            trade_time=trade_time,
        )

        public_notable_large_trade_largest_trade.additional_properties = d
        return public_notable_large_trade_largest_trade

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
