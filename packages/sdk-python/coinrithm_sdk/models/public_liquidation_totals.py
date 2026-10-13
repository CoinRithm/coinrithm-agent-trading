from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicLiquidationTotals")


@_attrs_define
class PublicLiquidationTotals:
    """Captured liquidation sums in USD (rounded to whole dollars) and event counts.

    Attributes:
        long_usd (float):
        short_usd (float):
        total_usd (float):
        long_events (int):
        short_events (int):
        events (int):
    """

    long_usd: float
    short_usd: float
    total_usd: float
    long_events: int
    short_events: int
    events: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        long_usd = self.long_usd

        short_usd = self.short_usd

        total_usd = self.total_usd

        long_events = self.long_events

        short_events = self.short_events

        events = self.events

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "longUsd": long_usd,
                "shortUsd": short_usd,
                "totalUsd": total_usd,
                "longEvents": long_events,
                "shortEvents": short_events,
                "events": events,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        long_usd = d.pop("longUsd")

        short_usd = d.pop("shortUsd")

        total_usd = d.pop("totalUsd")

        long_events = d.pop("longEvents")

        short_events = d.pop("shortEvents")

        events = d.pop("events")

        public_liquidation_totals = cls(
            long_usd=long_usd,
            short_usd=short_usd,
            total_usd=total_usd,
            long_events=long_events,
            short_events=short_events,
            events=events,
        )

        public_liquidation_totals.additional_properties = d
        return public_liquidation_totals

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
