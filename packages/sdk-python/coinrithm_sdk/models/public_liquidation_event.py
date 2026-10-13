from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicLiquidationEvent")


@_attrs_define
class PublicLiquidationEvent:
    """
    Attributes:
        venue (str):
        inst_id (str): Venue instrument id, e.g. `BTCUSDT` or `XAU-USDT-SWAP`.
        event_at (datetime.datetime):
        liquidated_side (str): `long` (a long was liquidated, a forced sell) or `short`.
        contracts (float): Size in venue contract units.
        price (float): OKX bankruptcy price; Binance liquidation order price.
        notional_usd (float): Notional in USDT, rounded to cents.
        market_url (str):
    """

    venue: str
    inst_id: str
    event_at: datetime.datetime
    liquidated_side: str
    contracts: float
    price: float
    notional_usd: float
    market_url: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        venue = self.venue

        inst_id = self.inst_id

        event_at = self.event_at.isoformat()

        liquidated_side = self.liquidated_side

        contracts = self.contracts

        price = self.price

        notional_usd = self.notional_usd

        market_url = self.market_url

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "venue": venue,
                "instId": inst_id,
                "eventAt": event_at,
                "liquidatedSide": liquidated_side,
                "contracts": contracts,
                "price": price,
                "notionalUsd": notional_usd,
                "marketUrl": market_url,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        venue = d.pop("venue")

        inst_id = d.pop("instId")

        event_at = datetime.datetime.fromisoformat(d.pop("eventAt").replace("Z", "+00:00"))

        liquidated_side = d.pop("liquidatedSide")

        contracts = d.pop("contracts")

        price = d.pop("price")

        notional_usd = d.pop("notionalUsd")

        market_url = d.pop("marketUrl")

        public_liquidation_event = cls(
            venue=venue,
            inst_id=inst_id,
            event_at=event_at,
            liquidated_side=liquidated_side,
            contracts=contracts,
            price=price,
            notional_usd=notional_usd,
            market_url=market_url,
        )

        public_liquidation_event.additional_properties = d
        return public_liquidation_event

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
