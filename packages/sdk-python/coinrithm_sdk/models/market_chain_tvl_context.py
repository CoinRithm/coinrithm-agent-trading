from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="MarketChainTvlContext")


@_attrs_define
class MarketChainTvlContext:
    """Value locked on the chain associated with this asset by DefiLlama,
    matched using two identifiers. The association does not prove this is
    the chain's native/gas token. TVL is not the coin's market value.
    Current TVL has no provider observation time; publication/fetch times
    are provenance, not substitutes for it. Null without a usable mapping
    and value. Times more than 60 seconds ahead are treated as unknown.

        Attributes:
            chain (str):
            tvl_usd (float): Current associated-chain TVL, rounded to whole USD.
            published_at (datetime.datetime | None): Response HTTP Last-Modified time; not an observation time.
            fetched_at (datetime.datetime | None): CoinRithm collection time.
            source_observed_at (None): Always null: the provider does not supply an observation time for current TVL.
            stale (bool): True when publication or fetch time is unknown, publication exceeds 6 hours, or fetch exceeds 3
                hours.
            day_at (datetime.datetime | None): Provider daily point used for changes; null when invalid, older than 2 days,
                or its value is unavailable.
            change_1_d_pct (float | None): Percent change between provider daily points, not current TVL versus yesterday.
                Null without a usable daily point and positive comparison base.
            change_7_d_pct (float | None): Percent change between provider daily points seven days apart; null without a
                usable daily point and positive comparison base.
            note (str): Chain-association and daily-comparison limitations.
    """

    chain: str
    tvl_usd: float
    published_at: datetime.datetime | None
    fetched_at: datetime.datetime | None
    source_observed_at: None
    stale: bool
    day_at: datetime.datetime | None
    change_1_d_pct: float | None
    change_7_d_pct: float | None
    note: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        chain = self.chain

        tvl_usd = self.tvl_usd

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

        source_observed_at = self.source_observed_at

        stale = self.stale

        day_at: None | str
        if isinstance(self.day_at, datetime.datetime):
            day_at = self.day_at.isoformat()
        else:
            day_at = self.day_at

        change_1_d_pct: float | None
        change_1_d_pct = self.change_1_d_pct

        change_7_d_pct: float | None
        change_7_d_pct = self.change_7_d_pct

        note = self.note

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "chain": chain,
                "tvlUsd": tvl_usd,
                "publishedAt": published_at,
                "fetchedAt": fetched_at,
                "sourceObservedAt": source_observed_at,
                "stale": stale,
                "dayAt": day_at,
                "change1dPct": change_1_d_pct,
                "change7dPct": change_7_d_pct,
                "note": note,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        chain = d.pop("chain")

        tvl_usd = d.pop("tvlUsd")

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

        source_observed_at = d.pop("sourceObservedAt")

        stale = d.pop("stale")

        def _parse_day_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                day_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return day_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        day_at = _parse_day_at(d.pop("dayAt"))

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

        note = d.pop("note")

        market_chain_tvl_context = cls(
            chain=chain,
            tvl_usd=tvl_usd,
            published_at=published_at,
            fetched_at=fetched_at,
            source_observed_at=source_observed_at,
            stale=stale,
            day_at=day_at,
            change_1_d_pct=change_1_d_pct,
            change_7_d_pct=change_7_d_pct,
            note=note,
        )

        market_chain_tvl_context.additional_properties = d
        return market_chain_tvl_context

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
