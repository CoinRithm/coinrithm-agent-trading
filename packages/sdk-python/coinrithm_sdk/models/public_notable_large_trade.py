from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_large_trade_links import PublicLargeTradeLinks
    from ..models.public_large_trade_taker import PublicLargeTradeTaker
    from ..models.public_notable_large_trade_largest_trade import PublicNotableLargeTradeLargestTrade
    from ..models.public_notable_large_trade_significance import PublicNotableLargeTradeSignificance


T = TypeVar("T", bound="PublicNotableLargeTrade")


@_attrs_define
class PublicNotableLargeTrade:
    """One burst: notable prints of the same venue, symbol and side at most
    60 seconds apart. Identity, addresses and links are the largest
    print's; sizes are summed over the burst.

        Attributes:
            id (str): The largest print's row id (`venue:symbol:tradeId`).
            venue (str):
            symbol (str):
            base (str):
            asset_class (str):
            side (str): Taker side: `buy` or `sell`.
            notional_usd (float): Summed over the burst.
            qty (float):
            avg_price (float):
            fills (int):
            trades (int): Prints in the burst.
            first_time (datetime.datetime):
            last_time (datetime.datetime):
            largest_trade (PublicNotableLargeTradeLargestTrade):
            buyer (None | str):
            seller (None | str):
            source_ref (None | str): Venue reference of the largest print (Hyperliquid transaction hash).
            links (PublicLargeTradeLinks):
            significance (PublicNotableLargeTradeSignificance): The largest print against its own market's distribution.
            taker (None | PublicLargeTradeTaker | Unset): The largest print's taker (same shape as on GET
                /api/market/large-trades). Null on Binance and on a Hyperliquid
                print not enriched yet or without a match.
    """

    id: str
    venue: str
    symbol: str
    base: str
    asset_class: str
    side: str
    notional_usd: float
    qty: float
    avg_price: float
    fills: int
    trades: int
    first_time: datetime.datetime
    last_time: datetime.datetime
    largest_trade: PublicNotableLargeTradeLargestTrade
    buyer: None | str
    seller: None | str
    source_ref: None | str
    links: PublicLargeTradeLinks
    significance: PublicNotableLargeTradeSignificance
    taker: None | PublicLargeTradeTaker | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_large_trade_taker import PublicLargeTradeTaker

        id = self.id

        venue = self.venue

        symbol = self.symbol

        base = self.base

        asset_class = self.asset_class

        side = self.side

        notional_usd = self.notional_usd

        qty = self.qty

        avg_price = self.avg_price

        fills = self.fills

        trades = self.trades

        first_time = self.first_time.isoformat()

        last_time = self.last_time.isoformat()

        largest_trade = self.largest_trade.to_dict()

        buyer: None | str
        buyer = self.buyer

        seller: None | str
        seller = self.seller

        source_ref: None | str
        source_ref = self.source_ref

        links = self.links.to_dict()

        significance = self.significance.to_dict()

        taker: dict[str, Any] | None | Unset
        if isinstance(self.taker, Unset):
            taker = UNSET
        elif isinstance(self.taker, PublicLargeTradeTaker):
            taker = self.taker.to_dict()
        else:
            taker = self.taker

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
                "notionalUsd": notional_usd,
                "qty": qty,
                "avgPrice": avg_price,
                "fills": fills,
                "trades": trades,
                "firstTime": first_time,
                "lastTime": last_time,
                "largestTrade": largest_trade,
                "buyer": buyer,
                "seller": seller,
                "sourceRef": source_ref,
                "links": links,
                "significance": significance,
            }
        )
        if taker is not UNSET:
            field_dict["taker"] = taker

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_large_trade_links import PublicLargeTradeLinks
        from ..models.public_large_trade_taker import PublicLargeTradeTaker
        from ..models.public_notable_large_trade_largest_trade import PublicNotableLargeTradeLargestTrade
        from ..models.public_notable_large_trade_significance import PublicNotableLargeTradeSignificance

        d = dict(src_dict)
        id = d.pop("id")

        venue = d.pop("venue")

        symbol = d.pop("symbol")

        base = d.pop("base")

        asset_class = d.pop("assetClass")

        side = d.pop("side")

        notional_usd = d.pop("notionalUsd")

        qty = d.pop("qty")

        avg_price = d.pop("avgPrice")

        fills = d.pop("fills")

        trades = d.pop("trades")

        first_time = datetime.datetime.fromisoformat(d.pop("firstTime").replace("Z", "+00:00"))

        last_time = datetime.datetime.fromisoformat(d.pop("lastTime").replace("Z", "+00:00"))

        largest_trade = PublicNotableLargeTradeLargestTrade.from_dict(d.pop("largestTrade"))

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

        def _parse_source_ref(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        source_ref = _parse_source_ref(d.pop("sourceRef"))

        links = PublicLargeTradeLinks.from_dict(d.pop("links"))

        significance = PublicNotableLargeTradeSignificance.from_dict(d.pop("significance"))

        def _parse_taker(data: object) -> None | PublicLargeTradeTaker | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                taker_type_0 = PublicLargeTradeTaker.from_dict(data)

                return taker_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicLargeTradeTaker | Unset, data)

        taker = _parse_taker(d.pop("taker", UNSET))

        public_notable_large_trade = cls(
            id=id,
            venue=venue,
            symbol=symbol,
            base=base,
            asset_class=asset_class,
            side=side,
            notional_usd=notional_usd,
            qty=qty,
            avg_price=avg_price,
            fills=fills,
            trades=trades,
            first_time=first_time,
            last_time=last_time,
            largest_trade=largest_trade,
            buyer=buyer,
            seller=seller,
            source_ref=source_ref,
            links=links,
            significance=significance,
            taker=taker,
        )

        public_notable_large_trade.additional_properties = d
        return public_notable_large_trade

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
