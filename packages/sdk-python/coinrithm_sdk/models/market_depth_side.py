from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="MarketDepthSide")


@_attrs_define
class MarketDepthSide:
    """
    Attributes:
        usd (float): Resting USD in returned levels, rounded to whole USD.
        reach_pct (float): Farthest returned level's distance from mid in percent; rounded to four decimals.
        levels (int):
        complete (bool): True only for a side returned whole with fewer than 20 levels. False means liquidity beyond
            reachPct is unknown, not zero.
    """

    usd: float
    reach_pct: float
    levels: int
    complete: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        usd = self.usd

        reach_pct = self.reach_pct

        levels = self.levels

        complete = self.complete

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "usd": usd,
                "reachPct": reach_pct,
                "levels": levels,
                "complete": complete,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        usd = d.pop("usd")

        reach_pct = d.pop("reachPct")

        levels = d.pop("levels")

        complete = d.pop("complete")

        market_depth_side = cls(
            usd=usd,
            reach_pct=reach_pct,
            levels=levels,
            complete=complete,
        )

        market_depth_side.additional_properties = d
        return market_depth_side

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
