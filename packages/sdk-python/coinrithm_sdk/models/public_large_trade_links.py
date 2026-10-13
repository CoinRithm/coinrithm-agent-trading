from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicLargeTradeLinks")


@_attrs_define
class PublicLargeTradeLinks:
    """
    Attributes:
        market (str): The venue's market page.
        buyer (None | str): Explorer page of the buyer address (Hyperliquid only).
        seller (None | str): Explorer page of the seller address (Hyperliquid only).
        tx (None | str): Explorer page of the transaction (Hyperliquid only).
    """

    market: str
    buyer: None | str
    seller: None | str
    tx: None | str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        market = self.market

        buyer: None | str
        buyer = self.buyer

        seller: None | str
        seller = self.seller

        tx: None | str
        tx = self.tx

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "market": market,
                "buyer": buyer,
                "seller": seller,
                "tx": tx,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        market = d.pop("market")

        def _parse_buyer(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        buyer = _parse_buyer(d.pop("buyer"))

        def _parse_seller(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        seller = _parse_seller(d.pop("seller"))

        def _parse_tx(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        tx = _parse_tx(d.pop("tx"))

        public_large_trade_links = cls(
            market=market,
            buyer=buyer,
            seller=seller,
            tx=tx,
        )

        public_large_trade_links.additional_properties = d
        return public_large_trade_links

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
