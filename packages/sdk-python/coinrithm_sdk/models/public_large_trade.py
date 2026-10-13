from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_large_trade_links import PublicLargeTradeLinks


T = TypeVar("T", bound="PublicLargeTrade")


@_attrs_define
class PublicLargeTrade:
    """
    Attributes:
        id (str): Opaque stable row id (`venue:symbol:tradeId`).
        venue (str): `binance` or `hyperliquid`.
        symbol (str): Venue symbol, e.g. `BTCUSDT` or the Hyperliquid HIP-3 market `xyz:TSLA`.
        base (str):
        asset_class (str): Best-effort label; currently crypto, equity, commodity, fx or index.
        side (str): Taker side: `buy` or `sell`.
        price (float): Average fill price in the quote stablecoin.
        qty (float): Size in base units.
        notional_usd (float): Notional in the venue's quote stablecoin (USDT/USDC).
        fills (int): Venue fills merged into this row.
        threshold_usd (float): The notional floor this market's prints must reach to be listed.
        trade_time (datetime.datetime): Venue trade time.
        ingested_at (datetime.datetime): When CoinRithm stored the row.
        buyer (None | str): Buyer address when the venue publishes it (Hyperliquid), else null.
        seller (None | str): Seller address when the venue publishes it (Hyperliquid), else null.
        links (PublicLargeTradeLinks):
    """

    id: str
    venue: str
    symbol: str
    base: str
    asset_class: str
    side: str
    price: float
    qty: float
    notional_usd: float
    fills: int
    threshold_usd: float
    trade_time: datetime.datetime
    ingested_at: datetime.datetime
    buyer: None | str
    seller: None | str
    links: PublicLargeTradeLinks
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        venue = self.venue

        symbol = self.symbol

        base = self.base

        asset_class = self.asset_class

        side = self.side

        price = self.price

        qty = self.qty

        notional_usd = self.notional_usd

        fills = self.fills

        threshold_usd = self.threshold_usd

        trade_time = self.trade_time.isoformat()

        ingested_at = self.ingested_at.isoformat()

        buyer: None | str
        buyer = self.buyer

        seller: None | str
        seller = self.seller

        links = self.links.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "venue": venue,
                "symbol": symbol,
                "base": base,
                "assetClass": asset_class,
                "side": side,
                "price": price,
                "qty": qty,
                "notionalUsd": notional_usd,
                "fills": fills,
                "thresholdUsd": threshold_usd,
                "tradeTime": trade_time,
                "ingestedAt": ingested_at,
                "buyer": buyer,
                "seller": seller,
                "links": links,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_large_trade_links import PublicLargeTradeLinks

        d = dict(src_dict)
        id = d.pop("id")

        venue = d.pop("venue")

        symbol = d.pop("symbol")

        base = d.pop("base")

        asset_class = d.pop("assetClass")

        side = d.pop("side")

        price = d.pop("price")

        qty = d.pop("qty")

        notional_usd = d.pop("notionalUsd")

        fills = d.pop("fills")

        threshold_usd = d.pop("thresholdUsd")

        trade_time = datetime.datetime.fromisoformat(d.pop("tradeTime").replace("Z", "+00:00"))

        ingested_at = datetime.datetime.fromisoformat(d.pop("ingestedAt").replace("Z", "+00:00"))

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

        links = PublicLargeTradeLinks.from_dict(d.pop("links"))

        public_large_trade = cls(
            id=id,
            venue=venue,
            symbol=symbol,
            base=base,
            asset_class=asset_class,
            side=side,
            price=price,
            qty=qty,
            notional_usd=notional_usd,
            fills=fills,
            threshold_usd=threshold_usd,
            trade_time=trade_time,
            ingested_at=ingested_at,
            buyer=buyer,
            seller=seller,
            links=links,
        )

        public_large_trade.additional_properties = d
        return public_large_trade

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
