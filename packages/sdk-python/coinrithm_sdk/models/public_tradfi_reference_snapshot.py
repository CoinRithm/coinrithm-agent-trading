from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_tradfi_reference_venue_quote import PublicTradfiReferenceVenueQuote


T = TypeVar("T", bound="PublicTradfiReferenceSnapshot")


@_attrs_define
class PublicTradfiReferenceSnapshot:
    """
    Attributes:
        bucket_start (datetime.datetime):
        fetched_at (datetime.datetime):
        consensus_price (float):
        min_price (float):
        max_price (float):
        venue_spread_pct (float):
        venue_count (int):
        venues (list[PublicTradfiReferenceVenueQuote]):
    """

    bucket_start: datetime.datetime
    fetched_at: datetime.datetime
    consensus_price: float
    min_price: float
    max_price: float
    venue_spread_pct: float
    venue_count: int
    venues: list[PublicTradfiReferenceVenueQuote]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        bucket_start = self.bucket_start.isoformat()

        fetched_at = self.fetched_at.isoformat()

        consensus_price = self.consensus_price

        min_price = self.min_price

        max_price = self.max_price

        venue_spread_pct = self.venue_spread_pct

        venue_count = self.venue_count

        venues = []
        for venues_item_data in self.venues:
            venues_item = venues_item_data.to_dict()
            venues.append(venues_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "bucketStart": bucket_start,
                "fetchedAt": fetched_at,
                "consensusPrice": consensus_price,
                "minPrice": min_price,
                "maxPrice": max_price,
                "venueSpreadPct": venue_spread_pct,
                "venueCount": venue_count,
                "venues": venues,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_tradfi_reference_venue_quote import PublicTradfiReferenceVenueQuote

        d = dict(src_dict)
        bucket_start = datetime.datetime.fromisoformat(d.pop("bucketStart").replace("Z", "+00:00"))

        fetched_at = datetime.datetime.fromisoformat(d.pop("fetchedAt").replace("Z", "+00:00"))

        consensus_price = d.pop("consensusPrice")

        min_price = d.pop("minPrice")

        max_price = d.pop("maxPrice")

        venue_spread_pct = d.pop("venueSpreadPct")

        venue_count = d.pop("venueCount")

        venues = []
        _venues = d.pop("venues")
        for venues_item_data in _venues:
            venues_item = PublicTradfiReferenceVenueQuote.from_dict(venues_item_data)

            venues.append(venues_item)

        public_tradfi_reference_snapshot = cls(
            bucket_start=bucket_start,
            fetched_at=fetched_at,
            consensus_price=consensus_price,
            min_price=min_price,
            max_price=max_price,
            venue_spread_pct=venue_spread_pct,
            venue_count=venue_count,
            venues=venues,
        )

        public_tradfi_reference_snapshot.additional_properties = d
        return public_tradfi_reference_snapshot

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
