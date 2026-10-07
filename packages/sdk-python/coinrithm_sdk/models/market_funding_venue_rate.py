from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.market_funding_venue_rate_freshness_basis import MarketFundingVenueRateFreshnessBasis
from ..models.market_funding_venue_rate_role import MarketFundingVenueRateRole
from ..models.market_funding_venue_rate_source import MarketFundingVenueRateSource

T = TypeVar("T", bound="MarketFundingVenueRate")


@_attrs_define
class MarketFundingVenueRate:
    """
    Attributes:
        role (MarketFundingVenueRateRole):
        venue (str):
        symbol (str):
        source (MarketFundingVenueRateSource):
        rate_fraction (float): Raw fraction per intervalHours, including valid zero/negative values; not percent.
        interval_hours (int | None): Null when unknown. Hyperliquid HlPerp context is hourly.
        hourly_equivalent_fraction (float | None): rateFraction / intervalHours; simple normalization, not realized
            performance, APR or forecast return. Null when interval unknown.
        next_funding_time (datetime.datetime | None): Null for missing/rolled/unusable provider boundaries; never
            advanced synthetically.
        fetched_at (datetime.datetime): CoinRithm collection time, not provider observation time.
        source_at (None): Provider observation time and delivery delay are unknown.
        age_seconds (int): Floor of collection age, clamped at zero.
        stale (bool): Collection age exceeds 1800 seconds.
        freshness_basis (MarketFundingVenueRateFreshnessBasis):
    """

    role: MarketFundingVenueRateRole
    venue: str
    symbol: str
    source: MarketFundingVenueRateSource
    rate_fraction: float
    interval_hours: int | None
    hourly_equivalent_fraction: float | None
    next_funding_time: datetime.datetime | None
    fetched_at: datetime.datetime
    source_at: None
    age_seconds: int
    stale: bool
    freshness_basis: MarketFundingVenueRateFreshnessBasis
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        role = self.role.value

        venue = self.venue

        symbol = self.symbol

        source = self.source.value

        rate_fraction = self.rate_fraction

        interval_hours: int | None
        interval_hours = self.interval_hours

        hourly_equivalent_fraction: float | None
        hourly_equivalent_fraction = self.hourly_equivalent_fraction

        next_funding_time: None | str
        if isinstance(self.next_funding_time, datetime.datetime):
            next_funding_time = self.next_funding_time.isoformat()
        else:
            next_funding_time = self.next_funding_time

        fetched_at = self.fetched_at.isoformat()

        source_at = self.source_at

        age_seconds = self.age_seconds

        stale = self.stale

        freshness_basis = self.freshness_basis.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "role": role,
                "venue": venue,
                "symbol": symbol,
                "source": source,
                "rateFraction": rate_fraction,
                "intervalHours": interval_hours,
                "hourlyEquivalentFraction": hourly_equivalent_fraction,
                "nextFundingTime": next_funding_time,
                "fetchedAt": fetched_at,
                "sourceAt": source_at,
                "ageSeconds": age_seconds,
                "stale": stale,
                "freshnessBasis": freshness_basis,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        role = MarketFundingVenueRateRole(d.pop("role"))

        venue = d.pop("venue")

        symbol = d.pop("symbol")

        source = MarketFundingVenueRateSource(d.pop("source"))

        rate_fraction = d.pop("rateFraction")

        def _parse_interval_hours(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        interval_hours = _parse_interval_hours(d.pop("intervalHours"))

        def _parse_hourly_equivalent_fraction(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        hourly_equivalent_fraction = _parse_hourly_equivalent_fraction(d.pop("hourlyEquivalentFraction"))

        def _parse_next_funding_time(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                next_funding_time_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return next_funding_time_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        next_funding_time = _parse_next_funding_time(d.pop("nextFundingTime"))

        fetched_at = datetime.datetime.fromisoformat(d.pop("fetchedAt").replace("Z", "+00:00"))

        source_at = d.pop("sourceAt")

        age_seconds = d.pop("ageSeconds")

        stale = d.pop("stale")

        freshness_basis = MarketFundingVenueRateFreshnessBasis(d.pop("freshnessBasis"))

        market_funding_venue_rate = cls(
            role=role,
            venue=venue,
            symbol=symbol,
            source=source,
            rate_fraction=rate_fraction,
            interval_hours=interval_hours,
            hourly_equivalent_fraction=hourly_equivalent_fraction,
            next_funding_time=next_funding_time,
            fetched_at=fetched_at,
            source_at=source_at,
            age_seconds=age_seconds,
            stale=stale,
            freshness_basis=freshness_basis,
        )

        market_funding_venue_rate.additional_properties = d
        return market_funding_venue_rate

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
