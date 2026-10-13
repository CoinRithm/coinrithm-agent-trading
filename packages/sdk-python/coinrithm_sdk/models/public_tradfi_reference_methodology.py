from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicTradfiReferenceMethodology")


@_attrs_define
class PublicTradfiReferenceMethodology:
    """
    Attributes:
        basis (str):
        aggregation (str):
        minimum_venue_count (int):
        max_venue_spread_pct (float):
        collection_interval_seconds (int):
        freshness_threshold_seconds (int):
        retention_days (int):
        live_max_age_seconds (int): A `live` value older than this is not served.
    """

    basis: str
    aggregation: str
    minimum_venue_count: int
    max_venue_spread_pct: float
    collection_interval_seconds: int
    freshness_threshold_seconds: int
    retention_days: int
    live_max_age_seconds: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        basis = self.basis

        aggregation = self.aggregation

        minimum_venue_count = self.minimum_venue_count

        max_venue_spread_pct = self.max_venue_spread_pct

        collection_interval_seconds = self.collection_interval_seconds

        freshness_threshold_seconds = self.freshness_threshold_seconds

        retention_days = self.retention_days

        live_max_age_seconds = self.live_max_age_seconds

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "basis": basis,
                "aggregation": aggregation,
                "minimumVenueCount": minimum_venue_count,
                "maxVenueSpreadPct": max_venue_spread_pct,
                "collectionIntervalSeconds": collection_interval_seconds,
                "freshnessThresholdSeconds": freshness_threshold_seconds,
                "retentionDays": retention_days,
                "liveMaxAgeSeconds": live_max_age_seconds,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        basis = d.pop("basis")

        aggregation = d.pop("aggregation")

        minimum_venue_count = d.pop("minimumVenueCount")

        max_venue_spread_pct = d.pop("maxVenueSpreadPct")

        collection_interval_seconds = d.pop("collectionIntervalSeconds")

        freshness_threshold_seconds = d.pop("freshnessThresholdSeconds")

        retention_days = d.pop("retentionDays")

        live_max_age_seconds = d.pop("liveMaxAgeSeconds")

        public_tradfi_reference_methodology = cls(
            basis=basis,
            aggregation=aggregation,
            minimum_venue_count=minimum_venue_count,
            max_venue_spread_pct=max_venue_spread_pct,
            collection_interval_seconds=collection_interval_seconds,
            freshness_threshold_seconds=freshness_threshold_seconds,
            retention_days=retention_days,
            live_max_age_seconds=live_max_age_seconds,
        )

        public_tradfi_reference_methodology.additional_properties = d
        return public_tradfi_reference_methodology

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
