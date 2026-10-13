from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicLiquidationVenueSummary")


@_attrs_define
class PublicLiquidationVenueSummary:
    """
    Attributes:
        venue (str): `binance` or `okx`.
        long_usd (float):
        short_usd (float):
        total_usd (float):
        long_events (int):
        short_events (int):
        events (int):
        inst_ids (list[str]):
        captured_pct (float | None): Lower bound of capture uptime for the window, 0-100. Null when no
            capture was recorded: a gap, never evidence of no liquidations.
        last_event_at (datetime.datetime | None):
    """

    venue: str
    long_usd: float
    short_usd: float
    total_usd: float
    long_events: int
    short_events: int
    events: int
    inst_ids: list[str]
    captured_pct: float | None
    last_event_at: datetime.datetime | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        venue = self.venue

        long_usd = self.long_usd

        short_usd = self.short_usd

        total_usd = self.total_usd

        long_events = self.long_events

        short_events = self.short_events

        events = self.events

        inst_ids = self.inst_ids

        captured_pct: float | None
        captured_pct = self.captured_pct

        last_event_at: None | str
        if isinstance(self.last_event_at, datetime.datetime):
            last_event_at = self.last_event_at.isoformat()
        else:
            last_event_at = self.last_event_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "venue": venue,
                "longUsd": long_usd,
                "shortUsd": short_usd,
                "totalUsd": total_usd,
                "longEvents": long_events,
                "shortEvents": short_events,
                "events": events,
                "instIds": inst_ids,
                "capturedPct": captured_pct,
                "lastEventAt": last_event_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        venue = d.pop("venue")

        long_usd = d.pop("longUsd")

        short_usd = d.pop("shortUsd")

        total_usd = d.pop("totalUsd")

        long_events = d.pop("longEvents")

        short_events = d.pop("shortEvents")

        events = d.pop("events")

        inst_ids = cast(list[str], d.pop("instIds"))

        def _parse_captured_pct(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        captured_pct = _parse_captured_pct(d.pop("capturedPct"))

        def _parse_last_event_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                last_event_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return last_event_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        last_event_at = _parse_last_event_at(d.pop("lastEventAt"))

        public_liquidation_venue_summary = cls(
            venue=venue,
            long_usd=long_usd,
            short_usd=short_usd,
            total_usd=total_usd,
            long_events=long_events,
            short_events=short_events,
            events=events,
            inst_ids=inst_ids,
            captured_pct=captured_pct,
            last_event_at=last_event_at,
        )

        public_liquidation_venue_summary.additional_properties = d
        return public_liquidation_venue_summary

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
