from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="MarketStablecoinContext")


@_attrs_define
class MarketStablecoinContext:
    """Total stablecoin supply across all pegs in USD, market-wide, from
    DefiLlama daily points. Null without a usable value and provider day.
    Unknown or more-than-60-seconds-future collection/publication times
    become null; an invalid/future provider day makes the block null.

        Attributes:
            total_usd (float): Total supply across all pegs, rounded to whole USD.
            day_at (datetime.datetime): Provider daily point; may be stale.
            change_1_d_pct (float | None): Percent change versus the previous daily point; null without a valid positive
                base. May be retained on a stale block.
            change_7_d_pct (float | None): Percent change versus the daily point seven days earlier; null without a valid
                positive base. May be retained on a stale block.
            stale (bool): True when the provider day exceeds 2 days, or collection time is unknown or exceeds 3 hours.
            published_at (datetime.datetime | None): Response HTTP Last-Modified time, not the provider daily point.
            fetched_at (datetime.datetime | None): CoinRithm collection time.
            note (str): Market-wide, all-pegs USD supply basis.
    """

    total_usd: float
    day_at: datetime.datetime
    change_1_d_pct: float | None
    change_7_d_pct: float | None
    stale: bool
    published_at: datetime.datetime | None
    fetched_at: datetime.datetime | None
    note: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        total_usd = self.total_usd

        day_at = self.day_at.isoformat()

        change_1_d_pct: float | None
        change_1_d_pct = self.change_1_d_pct

        change_7_d_pct: float | None
        change_7_d_pct = self.change_7_d_pct

        stale = self.stale

        published_at: None | str
        if isinstance(self.published_at, datetime.datetime):
            published_at = self.published_at.isoformat()
        else:
            published_at = self.published_at

        fetched_at: None | str
        if isinstance(self.fetched_at, datetime.datetime):
            fetched_at = self.fetched_at.isoformat()
        else:
            fetched_at = self.fetched_at

        note = self.note

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "totalUsd": total_usd,
                "dayAt": day_at,
                "change1dPct": change_1_d_pct,
                "change7dPct": change_7_d_pct,
                "stale": stale,
                "publishedAt": published_at,
                "fetchedAt": fetched_at,
                "note": note,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        total_usd = d.pop("totalUsd")

        day_at = datetime.datetime.fromisoformat(d.pop("dayAt").replace("Z", "+00:00"))

        def _parse_change_1_d_pct(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        change_1_d_pct = _parse_change_1_d_pct(d.pop("change1dPct"))

        def _parse_change_7_d_pct(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        change_7_d_pct = _parse_change_7_d_pct(d.pop("change7dPct"))

        stale = d.pop("stale")

        def _parse_published_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                published_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return published_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        published_at = _parse_published_at(d.pop("publishedAt"))

        def _parse_fetched_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                fetched_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return fetched_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        fetched_at = _parse_fetched_at(d.pop("fetchedAt"))

        note = d.pop("note")

        market_stablecoin_context = cls(
            total_usd=total_usd,
            day_at=day_at,
            change_1_d_pct=change_1_d_pct,
            change_7_d_pct=change_7_d_pct,
            stale=stale,
            published_at=published_at,
            fetched_at=fetched_at,
            note=note,
        )

        market_stablecoin_context.additional_properties = d
        return market_stablecoin_context

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
