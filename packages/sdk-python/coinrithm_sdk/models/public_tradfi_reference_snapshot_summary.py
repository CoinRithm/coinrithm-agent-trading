from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicTradfiReferenceSnapshotSummary")


@_attrs_define
class PublicTradfiReferenceSnapshotSummary:
    """
    Attributes:
        bucket_start (datetime.datetime): Start of the 15-minute collection bucket.
        fetched_at (datetime.datetime): Batch collection completion, not a venue quote time.
        consensus_price (float): Median of the venue index prices, in USDT.
        min_price (float):
        max_price (float):
        venue_spread_pct (float): Difference between venue index prices in percent, not a bid/ask spread.
        venue_count (int):
    """

    bucket_start: datetime.datetime
    fetched_at: datetime.datetime
    consensus_price: float
    min_price: float
    max_price: float
    venue_spread_pct: float
    venue_count: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        bucket_start = self.bucket_start.isoformat()

        fetched_at = self.fetched_at.isoformat()

        consensus_price = self.consensus_price

        min_price = self.min_price

        max_price = self.max_price

        venue_spread_pct = self.venue_spread_pct

        venue_count = self.venue_count

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
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        bucket_start = datetime.datetime.fromisoformat(d.pop("bucketStart").replace("Z", "+00:00"))

        fetched_at = datetime.datetime.fromisoformat(d.pop("fetchedAt").replace("Z", "+00:00"))

        consensus_price = d.pop("consensusPrice")

        min_price = d.pop("minPrice")

        max_price = d.pop("maxPrice")

        venue_spread_pct = d.pop("venueSpreadPct")

        venue_count = d.pop("venueCount")

        public_tradfi_reference_snapshot_summary = cls(
            bucket_start=bucket_start,
            fetched_at=fetched_at,
            consensus_price=consensus_price,
            min_price=min_price,
            max_price=max_price,
            venue_spread_pct=venue_spread_pct,
            venue_count=venue_count,
        )

        public_tradfi_reference_snapshot_summary.additional_properties = d
        return public_tradfi_reference_snapshot_summary

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
