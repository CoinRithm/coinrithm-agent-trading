from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="MarketFundingContext")


@_attrs_define
class MarketFundingContext:
    """One venue-attributed perpetual funding reference for this coin, not a
    cross-venue average. The market field is optional on older APIs and null
    without a usable reference. Display staleness does not determine futures
    entry eligibility; quote/open re-check their own reference rule.

        Attributes:
            venue (str):
            symbol (str):
            rate_pct (float): Signed percent per funding interval (0.0056 means 0.0056%, not a fraction); rounded to six
                decimals.
            interval_hours (int): Funding interval in hours; defaults to 8 when the stored interval is absent or zero.
            annualized_pct (float): Simple, non-compounded annualized percent; rounded to two decimals.
            next_funding_time (datetime.datetime):
            as_of (datetime.datetime): CoinRithm collection time, not a provider observation timestamp.
            age_seconds (int): Rounded collection age, clamped at zero.
            stale (bool): True when collection age exceeds 1800 seconds (30 minutes).
    """

    venue: str
    symbol: str
    rate_pct: float
    interval_hours: int
    annualized_pct: float
    next_funding_time: datetime.datetime
    as_of: datetime.datetime
    age_seconds: int
    stale: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        venue = self.venue

        symbol = self.symbol

        rate_pct = self.rate_pct

        interval_hours = self.interval_hours

        annualized_pct = self.annualized_pct

        next_funding_time = self.next_funding_time.isoformat()

        as_of = self.as_of.isoformat()

        age_seconds = self.age_seconds

        stale = self.stale

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "venue": venue,
                "symbol": symbol,
                "ratePct": rate_pct,
                "intervalHours": interval_hours,
                "annualizedPct": annualized_pct,
                "nextFundingTime": next_funding_time,
                "asOf": as_of,
                "ageSeconds": age_seconds,
                "stale": stale,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        venue = d.pop("venue")

        symbol = d.pop("symbol")

        rate_pct = d.pop("ratePct")

        interval_hours = d.pop("intervalHours")

        annualized_pct = d.pop("annualizedPct")

        next_funding_time = datetime.datetime.fromisoformat(d.pop("nextFundingTime").replace("Z", "+00:00"))

        as_of = datetime.datetime.fromisoformat(d.pop("asOf").replace("Z", "+00:00"))

        age_seconds = d.pop("ageSeconds")

        stale = d.pop("stale")

        market_funding_context = cls(
            venue=venue,
            symbol=symbol,
            rate_pct=rate_pct,
            interval_hours=interval_hours,
            annualized_pct=annualized_pct,
            next_funding_time=next_funding_time,
            as_of=as_of,
            age_seconds=age_seconds,
            stale=stale,
        )

        market_funding_context.additional_properties = d
        return market_funding_context

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
