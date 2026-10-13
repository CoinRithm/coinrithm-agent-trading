from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="AgentUniverseRow")


@_attrs_define
class AgentUniverseRow:
    """
    Attributes:
        ucid (str): Coin UCID
        symbol (str):
        name (str):
        slug (str):
        market_cap_rank (int):
        price_usd (float):
        change1h (float | None): Percent change.
        change24h (float | None): Percent change.
        change7d (float | None): Percent change.
        volume_24_h_usd (float):
        market_cap_usd (float | None):
        price_updated_at (datetime.datetime): Last write of the coin's live price row.
        sectors (list[str]): Curated sector/ecosystem ids the coin belongs to (may be empty).
        price_age_hours (float | None): Hours since priceUpdatedAt, one decimal, computed when the response was built.
        price_stale (bool):
        price_stale_after_hours (int):
    """

    ucid: str
    symbol: str
    name: str
    slug: str
    market_cap_rank: int
    price_usd: float
    change1h: float | None
    change24h: float | None
    change7d: float | None
    volume_24_h_usd: float
    market_cap_usd: float | None
    price_updated_at: datetime.datetime
    sectors: list[str]
    price_age_hours: float | None
    price_stale: bool
    price_stale_after_hours: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        ucid = self.ucid

        symbol = self.symbol

        name = self.name

        slug = self.slug

        market_cap_rank = self.market_cap_rank

        price_usd = self.price_usd

        change1h: float | None
        change1h = self.change1h

        change24h: float | None
        change24h = self.change24h

        change7d: float | None
        change7d = self.change7d

        volume_24_h_usd = self.volume_24_h_usd

        market_cap_usd: float | None
        market_cap_usd = self.market_cap_usd

        price_updated_at = self.price_updated_at.isoformat()

        sectors = self.sectors

        price_age_hours: float | None
        price_age_hours = self.price_age_hours

        price_stale = self.price_stale

        price_stale_after_hours = self.price_stale_after_hours

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "ucid": ucid,
                "symbol": symbol,
                "name": name,
                "slug": slug,
                "marketCapRank": market_cap_rank,
                "priceUsd": price_usd,
                "change1h": change1h,
                "change24h": change24h,
                "change7d": change7d,
                "volume24hUsd": volume_24_h_usd,
                "marketCapUsd": market_cap_usd,
                "priceUpdatedAt": price_updated_at,
                "sectors": sectors,
                "priceAgeHours": price_age_hours,
                "priceStale": price_stale,
                "priceStaleAfterHours": price_stale_after_hours,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        ucid = d.pop("ucid")

        symbol = d.pop("symbol")

        name = d.pop("name")

        slug = d.pop("slug")

        market_cap_rank = d.pop("marketCapRank")

        price_usd = d.pop("priceUsd")

        def _parse_change1h(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        change1h = _parse_change1h(d.pop("change1h"))

        def _parse_change24h(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        change24h = _parse_change24h(d.pop("change24h"))

        def _parse_change7d(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        change7d = _parse_change7d(d.pop("change7d"))

        volume_24_h_usd = d.pop("volume24hUsd")

        def _parse_market_cap_usd(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        market_cap_usd = _parse_market_cap_usd(d.pop("marketCapUsd"))

        price_updated_at = datetime.datetime.fromisoformat(d.pop("priceUpdatedAt").replace("Z", "+00:00"))

        sectors = cast(list[str], d.pop("sectors"))

        def _parse_price_age_hours(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        price_age_hours = _parse_price_age_hours(d.pop("priceAgeHours"))

        price_stale = d.pop("priceStale")

        price_stale_after_hours = d.pop("priceStaleAfterHours")

        agent_universe_row = cls(
            ucid=ucid,
            symbol=symbol,
            name=name,
            slug=slug,
            market_cap_rank=market_cap_rank,
            price_usd=price_usd,
            change1h=change1h,
            change24h=change24h,
            change7d=change7d,
            volume_24_h_usd=volume_24_h_usd,
            market_cap_usd=market_cap_usd,
            price_updated_at=price_updated_at,
            sectors=sectors,
            price_age_hours=price_age_hours,
            price_stale=price_stale,
            price_stale_after_hours=price_stale_after_hours,
        )

        agent_universe_row.additional_properties = d
        return agent_universe_row

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
