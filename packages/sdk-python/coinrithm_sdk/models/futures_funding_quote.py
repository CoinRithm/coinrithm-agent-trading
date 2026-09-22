from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="FuturesFundingQuote")


@_attrs_define
class FuturesFundingQuote:
    """Latest funding rate used by the futures quote. The rate is signed as
    provided by the venue: for a long, a positive rate produces a positive
    estimated payment; a negative rate produces a receipt. The estimate is
    for the quoted position at the next settlement and is signed the same
    way (positive = paid, negative = received). `estimatedPerIntervalMusd`
    is null when the quote cannot price a position; zero remains a real
    estimate.

        Attributes:
            venue (str): Funding-rate venue identifier.
            symbol (str): Venue perpetual symbol.
            rate (float): Signed venue funding rate for the next settlement.
            interval_hours (int): Funding settlement interval in hours.
            next_funding_time (datetime.datetime): Next expected funding settlement.
            as_of (datetime.datetime): When this venue rate was fetched.
            estimated_per_interval_musd (float | None): Signed estimated payment for the quoted position in mUSD (positive =
                paid, negative = received); null when unavailable. Zero is meaningful.
            annualized_rate (float): Signed simple annualized rate (rate multiplied by intervals per year; not compounded).
    """

    venue: str
    symbol: str
    rate: float
    interval_hours: int
    next_funding_time: datetime.datetime
    as_of: datetime.datetime
    estimated_per_interval_musd: float | None
    annualized_rate: float
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        venue = self.venue

        symbol = self.symbol

        rate = self.rate

        interval_hours = self.interval_hours

        next_funding_time = self.next_funding_time.isoformat()

        as_of = self.as_of.isoformat()

        estimated_per_interval_musd: float | None
        estimated_per_interval_musd = self.estimated_per_interval_musd

        annualized_rate = self.annualized_rate

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "venue": venue,
                "symbol": symbol,
                "rate": rate,
                "intervalHours": interval_hours,
                "nextFundingTime": next_funding_time,
                "asOf": as_of,
                "estimatedPerIntervalMusd": estimated_per_interval_musd,
                "annualizedRate": annualized_rate,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        venue = d.pop("venue")

        symbol = d.pop("symbol")

        rate = d.pop("rate")

        interval_hours = d.pop("intervalHours")

        next_funding_time = datetime.datetime.fromisoformat(d.pop("nextFundingTime"))

        as_of = datetime.datetime.fromisoformat(d.pop("asOf"))

        def _parse_estimated_per_interval_musd(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        estimated_per_interval_musd = _parse_estimated_per_interval_musd(d.pop("estimatedPerIntervalMusd"))

        annualized_rate = d.pop("annualizedRate")

        futures_funding_quote = cls(
            venue=venue,
            symbol=symbol,
            rate=rate,
            interval_hours=interval_hours,
            next_funding_time=next_funding_time,
            as_of=as_of,
            estimated_per_interval_musd=estimated_per_interval_musd,
            annualized_rate=annualized_rate,
        )

        futures_funding_quote.additional_properties = d
        return futures_funding_quote

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
