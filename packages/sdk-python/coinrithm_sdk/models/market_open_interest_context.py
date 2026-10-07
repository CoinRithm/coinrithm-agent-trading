from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.market_open_interest_venue import MarketOpenInterestVenue


T = TypeVar("T", bound="MarketOpenInterestContext")


@_attrs_define
class MarketOpenInterestContext:
    """Single-side perpetual open interest in USD from covered Bybit/OKX
    contracts, not total-market open interest. Reads up to 25 hours of
    15-minute buckets. Only venues in the newest bucket or one bucket behind
    contribute to the total; this relative inclusion rule can include stale
    data. Null when no usable reading exists. A finite zero is valid.

        Attributes:
            total_usd (float): Sum of included single-side USD readings, rounded to whole USD.
            change_1_h_pct (float | None): Percent change over matching venue and contract buckets exactly one hour apart;
                null without a positive comparable base.
            change_1_h_venues (list[str]): Contributing venues for change1hPct; empty when the change is null.
            change_24_h_pct (float | None): Percent change over matching venue and contract buckets exactly 24 hours apart;
                null without a positive comparable base.
            change_24_h_venues (list[str]): Contributing venues for change24hPct; empty when the change is null.
            venues (list[MarketOpenInterestVenue]): Included venues, descending by open interest; each retains its own
                provider timestamp.
            as_of (datetime.datetime): Newest provider timestamp among included venues; does not date every venue.
            age_seconds (int): Rounded age of asOf, clamped at zero.
            stale (bool): True when ageSeconds exceeds 2700 (45 minutes).
    """

    total_usd: float
    change_1_h_pct: float | None
    change_1_h_venues: list[str]
    change_24_h_pct: float | None
    change_24_h_venues: list[str]
    venues: list[MarketOpenInterestVenue]
    as_of: datetime.datetime
    age_seconds: int
    stale: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        total_usd = self.total_usd

        change_1_h_pct: float | None
        change_1_h_pct = self.change_1_h_pct

        change_1_h_venues = self.change_1_h_venues

        change_24_h_pct: float | None
        change_24_h_pct = self.change_24_h_pct

        change_24_h_venues = self.change_24_h_venues

        venues = []
        for venues_item_data in self.venues:
            venues_item = venues_item_data.to_dict()
            venues.append(venues_item)

        as_of = self.as_of.isoformat()

        age_seconds = self.age_seconds

        stale = self.stale

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "totalUsd": total_usd,
                "change1hPct": change_1_h_pct,
                "change1hVenues": change_1_h_venues,
                "change24hPct": change_24_h_pct,
                "change24hVenues": change_24_h_venues,
                "venues": venues,
                "asOf": as_of,
                "ageSeconds": age_seconds,
                "stale": stale,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.market_open_interest_venue import MarketOpenInterestVenue

        d = dict(src_dict)
        total_usd = d.pop("totalUsd")

        def _parse_change_1_h_pct(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        change_1_h_pct = _parse_change_1_h_pct(d.pop("change1hPct"))

        change_1_h_venues = cast(list[str], d.pop("change1hVenues"))

        def _parse_change_24_h_pct(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        change_24_h_pct = _parse_change_24_h_pct(d.pop("change24hPct"))

        change_24_h_venues = cast(list[str], d.pop("change24hVenues"))

        venues = []
        _venues = d.pop("venues")
        for venues_item_data in _venues:
            venues_item = MarketOpenInterestVenue.from_dict(venues_item_data)

            venues.append(venues_item)

        as_of = datetime.datetime.fromisoformat(d.pop("asOf").replace("Z", "+00:00"))

        age_seconds = d.pop("ageSeconds")

        stale = d.pop("stale")

        market_open_interest_context = cls(
            total_usd=total_usd,
            change_1_h_pct=change_1_h_pct,
            change_1_h_venues=change_1_h_venues,
            change_24_h_pct=change_24_h_pct,
            change_24_h_venues=change_24_h_venues,
            venues=venues,
            as_of=as_of,
            age_seconds=age_seconds,
            stale=stale,
        )

        market_open_interest_context.additional_properties = d
        return market_open_interest_context

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
