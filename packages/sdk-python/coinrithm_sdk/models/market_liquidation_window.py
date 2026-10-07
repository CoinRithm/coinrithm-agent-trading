from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="MarketLiquidationWindow")


@_attrs_define
class MarketLiquidationWindow:
    """
    Attributes:
        long_liquidated_usdt (float): Captured liquidated-long notional in USDT, rounded to whole USDT.
        short_liquidated_usdt (float): Captured liquidated-short notional in USDT, rounded to whole USDT.
        events (int):
        captured_pct (float): Conservative lower bound of capture uptime within this window, floored to 0.1 percent. Not
            exchange completeness or a missing-event estimate.
    """

    long_liquidated_usdt: float
    short_liquidated_usdt: float
    events: int
    captured_pct: float
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        long_liquidated_usdt = self.long_liquidated_usdt

        short_liquidated_usdt = self.short_liquidated_usdt

        events = self.events

        captured_pct = self.captured_pct

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "longLiquidatedUsdt": long_liquidated_usdt,
                "shortLiquidatedUsdt": short_liquidated_usdt,
                "events": events,
                "capturedPct": captured_pct,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        long_liquidated_usdt = d.pop("longLiquidatedUsdt")

        short_liquidated_usdt = d.pop("shortLiquidatedUsdt")

        events = d.pop("events")

        captured_pct = d.pop("capturedPct")

        market_liquidation_window = cls(
            long_liquidated_usdt=long_liquidated_usdt,
            short_liquidated_usdt=short_liquidated_usdt,
            events=events,
            captured_pct=captured_pct,
        )

        market_liquidation_window.additional_properties = d
        return market_liquidation_window

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
