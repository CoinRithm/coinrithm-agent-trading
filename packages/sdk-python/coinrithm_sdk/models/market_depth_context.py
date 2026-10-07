from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.market_depth_side import MarketDepthSide


T = TypeVar("T", bound="MarketDepthContext")


@_attrs_define
class MarketDepthContext:
    """Hyperliquid's observed book only: at most 20 full-precision levels per
    side, not total-market liquidity or an executable fill estimate. Latest
    stored bucket within 30 minutes for reviewed coins. Null without a
    usable snapshot; each side can independently be null when invalid.
    Provider times more than 60 seconds ahead are rejected.

        Attributes:
            venue (str):
            mid (float): Mid-price in USD of the observed book.
            bid (MarketDepthSide | None):
            ask (MarketDepthSide | None):
            as_of (datetime.datetime): Provider book timestamp.
            age_seconds (int): Rounded provider age, clamped at zero.
            stale (bool): True when ageSeconds exceeds 900 (15 minutes).
            note (str): One-venue visible-book and completeness limitations.
    """

    venue: str
    mid: float
    bid: MarketDepthSide | None
    ask: MarketDepthSide | None
    as_of: datetime.datetime
    age_seconds: int
    stale: bool
    note: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.market_depth_side import MarketDepthSide

        venue = self.venue

        mid = self.mid

        bid: dict[str, Any] | None
        if isinstance(self.bid, MarketDepthSide):
            bid = self.bid.to_dict()
        else:
            bid = self.bid

        ask: dict[str, Any] | None
        if isinstance(self.ask, MarketDepthSide):
            ask = self.ask.to_dict()
        else:
            ask = self.ask

        as_of = self.as_of.isoformat()

        age_seconds = self.age_seconds

        stale = self.stale

        note = self.note

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "venue": venue,
                "mid": mid,
                "bid": bid,
                "ask": ask,
                "asOf": as_of,
                "ageSeconds": age_seconds,
                "stale": stale,
                "note": note,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.market_depth_side import MarketDepthSide

        d = dict(src_dict)
        venue = d.pop("venue")

        mid = d.pop("mid")

        def _parse_bid(data: object) -> MarketDepthSide | None:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                bid_type_0 = MarketDepthSide.from_dict(data)

                return bid_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(MarketDepthSide | None, data)

        bid = _parse_bid(d.pop("bid"))

        def _parse_ask(data: object) -> MarketDepthSide | None:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                ask_type_0 = MarketDepthSide.from_dict(data)

                return ask_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(MarketDepthSide | None, data)

        ask = _parse_ask(d.pop("ask"))

        as_of = datetime.datetime.fromisoformat(d.pop("asOf").replace("Z", "+00:00"))

        age_seconds = d.pop("ageSeconds")

        stale = d.pop("stale")

        note = d.pop("note")

        market_depth_context = cls(
            venue=venue,
            mid=mid,
            bid=bid,
            ask=ask,
            as_of=as_of,
            age_seconds=age_seconds,
            stale=stale,
            note=note,
        )

        market_depth_context.additional_properties = d
        return market_depth_context

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
