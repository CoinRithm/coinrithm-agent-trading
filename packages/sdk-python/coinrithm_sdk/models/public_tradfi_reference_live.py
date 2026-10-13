from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_tradfi_reference_live_venue import PublicTradfiReferenceLiveVenue


T = TypeVar("T", bound="PublicTradfiReferenceLive")


@_attrs_define
class PublicTradfiReferenceLive:
    """Near-real-time consensus with the same method as `latest`, republished
    about every 10 seconds. Null when the overlay is off or unavailable,
    fails validation, or is older than `liveMaxAgeSeconds`; `latest` and
    every derived field are unaffected by it.

        Attributes:
            price (float):
            min_price (float):
            max_price (float):
            venue_spread_pct (float):
            venue_count (int):
            venues (list[PublicTradfiReferenceLiveVenue]):
            source_at (datetime.datetime): Oldest venue read inside this consensus, the honest age of the price.
            age_seconds (int):
            change_24_h_pct (float | None): Live price against the same reference as `change24h`.
    """

    price: float
    min_price: float
    max_price: float
    venue_spread_pct: float
    venue_count: int
    venues: list[PublicTradfiReferenceLiveVenue]
    source_at: datetime.datetime
    age_seconds: int
    change_24_h_pct: float | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        price = self.price

        min_price = self.min_price

        max_price = self.max_price

        venue_spread_pct = self.venue_spread_pct

        venue_count = self.venue_count

        venues = []
        for venues_item_data in self.venues:
            venues_item = venues_item_data.to_dict()
            venues.append(venues_item)

        source_at = self.source_at.isoformat()

        age_seconds = self.age_seconds

        change_24_h_pct: float | None
        change_24_h_pct = self.change_24_h_pct

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "price": price,
                "minPrice": min_price,
                "maxPrice": max_price,
                "venueSpreadPct": venue_spread_pct,
                "venueCount": venue_count,
                "venues": venues,
                "sourceAt": source_at,
                "ageSeconds": age_seconds,
                "change24hPct": change_24_h_pct,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_tradfi_reference_live_venue import PublicTradfiReferenceLiveVenue

        d = dict(src_dict)
        price = d.pop("price")

        min_price = d.pop("minPrice")

        max_price = d.pop("maxPrice")

        venue_spread_pct = d.pop("venueSpreadPct")

        venue_count = d.pop("venueCount")

        venues = []
        _venues = d.pop("venues")
        for venues_item_data in _venues:
            venues_item = PublicTradfiReferenceLiveVenue.from_dict(venues_item_data)

            venues.append(venues_item)

        source_at = datetime.datetime.fromisoformat(d.pop("sourceAt").replace("Z", "+00:00"))

        age_seconds = d.pop("ageSeconds")

        def _parse_change_24_h_pct(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        change_24_h_pct = _parse_change_24_h_pct(d.pop("change24hPct"))

        public_tradfi_reference_live = cls(
            price=price,
            min_price=min_price,
            max_price=max_price,
            venue_spread_pct=venue_spread_pct,
            venue_count=venue_count,
            venues=venues,
            source_at=source_at,
            age_seconds=age_seconds,
            change_24_h_pct=change_24_h_pct,
        )

        public_tradfi_reference_live.additional_properties = d
        return public_tradfi_reference_live

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
