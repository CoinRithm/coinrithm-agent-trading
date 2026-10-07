from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.market_positioning_metric import MarketPositioningMetric


T = TypeVar("T", bound="MarketPositioningContext")


@_attrs_define
class MarketPositioningContext:
    """Binance positioning for covered top coins by open interest. Each metric
    is the newest usable value on the newest bucket's venue and contract,
    within a 75-minute bucket lookback. Metrics retain independent provider
    period timestamps; times more than 60 seconds ahead are rejected. Null
    when no metric is usable, not evidence of balanced positioning.

        Attributes:
            venue (str):
            symbol (str):
            long_short_account_ratio (MarketPositioningMetric | None): Accounts long divided by accounts short on this
                perpetual.
            long_account_pct (MarketPositioningMetric | None): Share of accounts long, in percent (not a 0..1 fraction).
            top_trader_position_ratio (MarketPositioningMetric | None): Top traders' long divided by short, by position
                size.
            taker_buy_sell_ratio (MarketPositioningMetric | None): Taker buy volume divided by sell volume in the last
                closed 15-minute period.
    """

    venue: str
    symbol: str
    long_short_account_ratio: MarketPositioningMetric | None
    long_account_pct: MarketPositioningMetric | None
    top_trader_position_ratio: MarketPositioningMetric | None
    taker_buy_sell_ratio: MarketPositioningMetric | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.market_positioning_metric import MarketPositioningMetric

        venue = self.venue

        symbol = self.symbol

        long_short_account_ratio: dict[str, Any] | None
        if isinstance(self.long_short_account_ratio, MarketPositioningMetric):
            long_short_account_ratio = self.long_short_account_ratio.to_dict()
        else:
            long_short_account_ratio = self.long_short_account_ratio

        long_account_pct: dict[str, Any] | None
        if isinstance(self.long_account_pct, MarketPositioningMetric):
            long_account_pct = self.long_account_pct.to_dict()
        else:
            long_account_pct = self.long_account_pct

        top_trader_position_ratio: dict[str, Any] | None
        if isinstance(self.top_trader_position_ratio, MarketPositioningMetric):
            top_trader_position_ratio = self.top_trader_position_ratio.to_dict()
        else:
            top_trader_position_ratio = self.top_trader_position_ratio

        taker_buy_sell_ratio: dict[str, Any] | None
        if isinstance(self.taker_buy_sell_ratio, MarketPositioningMetric):
            taker_buy_sell_ratio = self.taker_buy_sell_ratio.to_dict()
        else:
            taker_buy_sell_ratio = self.taker_buy_sell_ratio

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "venue": venue,
                "symbol": symbol,
                "longShortAccountRatio": long_short_account_ratio,
                "longAccountPct": long_account_pct,
                "topTraderPositionRatio": top_trader_position_ratio,
                "takerBuySellRatio": taker_buy_sell_ratio,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.market_positioning_metric import MarketPositioningMetric

        d = dict(src_dict)
        venue = d.pop("venue")

        symbol = d.pop("symbol")

        def _parse_long_short_account_ratio(data: object) -> MarketPositioningMetric | None:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                long_short_account_ratio_type_0 = MarketPositioningMetric.from_dict(data)

                return long_short_account_ratio_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(MarketPositioningMetric | None, data)

        long_short_account_ratio = _parse_long_short_account_ratio(d.pop("longShortAccountRatio"))

        def _parse_long_account_pct(data: object) -> MarketPositioningMetric | None:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                long_account_pct_type_0 = MarketPositioningMetric.from_dict(data)

                return long_account_pct_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(MarketPositioningMetric | None, data)

        long_account_pct = _parse_long_account_pct(d.pop("longAccountPct"))

        def _parse_top_trader_position_ratio(data: object) -> MarketPositioningMetric | None:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                top_trader_position_ratio_type_0 = MarketPositioningMetric.from_dict(data)

                return top_trader_position_ratio_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(MarketPositioningMetric | None, data)

        top_trader_position_ratio = _parse_top_trader_position_ratio(d.pop("topTraderPositionRatio"))

        def _parse_taker_buy_sell_ratio(data: object) -> MarketPositioningMetric | None:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                taker_buy_sell_ratio_type_0 = MarketPositioningMetric.from_dict(data)

                return taker_buy_sell_ratio_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(MarketPositioningMetric | None, data)

        taker_buy_sell_ratio = _parse_taker_buy_sell_ratio(d.pop("takerBuySellRatio"))

        market_positioning_context = cls(
            venue=venue,
            symbol=symbol,
            long_short_account_ratio=long_short_account_ratio,
            long_account_pct=long_account_pct,
            top_trader_position_ratio=top_trader_position_ratio,
            taker_buy_sell_ratio=taker_buy_sell_ratio,
        )

        market_positioning_context.additional_properties = d
        return market_positioning_context

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
