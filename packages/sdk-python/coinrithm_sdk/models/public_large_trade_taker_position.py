from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicLargeTradeTakerPosition")


@_attrs_define
class PublicLargeTradeTakerPosition:
    """
    Attributes:
        size (float | None): Signed position size in base units (negative is short); 0 when flat.
        avg_entry_price (float | None):
        leverage (float | None):
        liquidation_price (float | None):
        unrealized_pnl_usd (float | None):
        as_of (datetime.datetime): When the position was read.
    """

    size: float | None
    avg_entry_price: float | None
    leverage: float | None
    liquidation_price: float | None
    unrealized_pnl_usd: float | None
    as_of: datetime.datetime
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        size: float | None
        size = self.size

        avg_entry_price: float | None
        avg_entry_price = self.avg_entry_price

        leverage: float | None
        leverage = self.leverage

        liquidation_price: float | None
        liquidation_price = self.liquidation_price

        unrealized_pnl_usd: float | None
        unrealized_pnl_usd = self.unrealized_pnl_usd

        as_of = self.as_of.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "size": size,
                "avgEntryPrice": avg_entry_price,
                "leverage": leverage,
                "liquidationPrice": liquidation_price,
                "unrealizedPnlUsd": unrealized_pnl_usd,
                "asOf": as_of,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_size(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        size = _parse_size(d.pop("size"))

        def _parse_avg_entry_price(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        avg_entry_price = _parse_avg_entry_price(d.pop("avgEntryPrice"))

        def _parse_leverage(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        leverage = _parse_leverage(d.pop("leverage"))

        def _parse_liquidation_price(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        liquidation_price = _parse_liquidation_price(d.pop("liquidationPrice"))

        def _parse_unrealized_pnl_usd(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        unrealized_pnl_usd = _parse_unrealized_pnl_usd(d.pop("unrealizedPnlUsd"))

        as_of = datetime.datetime.fromisoformat(d.pop("asOf").replace("Z", "+00:00"))

        public_large_trade_taker_position = cls(
            size=size,
            avg_entry_price=avg_entry_price,
            leverage=leverage,
            liquidation_price=liquidation_price,
            unrealized_pnl_usd=unrealized_pnl_usd,
            as_of=as_of,
        )

        public_large_trade_taker_position.additional_properties = d
        return public_large_trade_taker_position

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
