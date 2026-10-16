from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicLivePriceRow")


@_attrs_define
class PublicLivePriceRow:
    """
    Attributes:
        ucid (str): CoinRithm coin id, the `coinId` of the agent endpoints.
        slug (str):
        symbol (str):
        name (str):
        current_price (float): Price in `fiat`.
        price_stale (bool): true when older than `priceStaleAfterHours`.
        price_stale_after_hours (float): Staleness threshold in hours (72).
        rank (int | None | Unset): Market-cap rank.
        change1h (float | None | Unset): Percent.
        change24h (float | None | Unset): Percent.
        change7d (float | None | Unset): Percent.
        high24h (float | None | Unset):
        low24h (float | None | Unset):
        volume24h (float | None | Unset):
        volume_change_24_h (float | None | Unset): Percent.
        volume_missing_venues (int | None | Unset): Expected venues missing from `volume24h` because their fetch failed;
            0 none known, null unknown.
        market_cap_fiat (float | None | Unset): Market cap in `fiat`.
        market_cap_change_24_h (float | None | Unset): Percent.
        market_cap_suspect (bool | Unset): true when CoinRithm does not trust the market cap.
        supply_circulating (float | None | Unset):
        supply_total (float | None | Unset):
        price_updated_at (datetime.datetime | None | Unset): Live-price write time.
        price_age_hours (float | None | Unset): Hours since `priceUpdatedAt`, one decimal.
        sparkline15m (list[float] | None | Unset): About 7 days of hourly prices in `fiat`, oldest first, despite the
            name; null with `includeSparkline=false`.
    """

    ucid: str
    slug: str
    symbol: str
    name: str
    current_price: float
    price_stale: bool
    price_stale_after_hours: float
    rank: int | None | Unset = UNSET
    change1h: float | None | Unset = UNSET
    change24h: float | None | Unset = UNSET
    change7d: float | None | Unset = UNSET
    high24h: float | None | Unset = UNSET
    low24h: float | None | Unset = UNSET
    volume24h: float | None | Unset = UNSET
    volume_change_24_h: float | None | Unset = UNSET
    volume_missing_venues: int | None | Unset = UNSET
    market_cap_fiat: float | None | Unset = UNSET
    market_cap_change_24_h: float | None | Unset = UNSET
    market_cap_suspect: bool | Unset = UNSET
    supply_circulating: float | None | Unset = UNSET
    supply_total: float | None | Unset = UNSET
    price_updated_at: datetime.datetime | None | Unset = UNSET
    price_age_hours: float | None | Unset = UNSET
    sparkline15m: list[float] | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        ucid = self.ucid

        slug = self.slug

        symbol = self.symbol

        name = self.name

        current_price = self.current_price

        price_stale = self.price_stale

        price_stale_after_hours = self.price_stale_after_hours

        rank: int | None | Unset
        if isinstance(self.rank, Unset):
            rank = UNSET
        else:
            rank = self.rank

        change1h: float | None | Unset
        if isinstance(self.change1h, Unset):
            change1h = UNSET
        else:
            change1h = self.change1h

        change24h: float | None | Unset
        if isinstance(self.change24h, Unset):
            change24h = UNSET
        else:
            change24h = self.change24h

        change7d: float | None | Unset
        if isinstance(self.change7d, Unset):
            change7d = UNSET
        else:
            change7d = self.change7d

        high24h: float | None | Unset
        if isinstance(self.high24h, Unset):
            high24h = UNSET
        else:
            high24h = self.high24h

        low24h: float | None | Unset
        if isinstance(self.low24h, Unset):
            low24h = UNSET
        else:
            low24h = self.low24h

        volume24h: float | None | Unset
        if isinstance(self.volume24h, Unset):
            volume24h = UNSET
        else:
            volume24h = self.volume24h

        volume_change_24_h: float | None | Unset
        if isinstance(self.volume_change_24_h, Unset):
            volume_change_24_h = UNSET
        else:
            volume_change_24_h = self.volume_change_24_h

        volume_missing_venues: int | None | Unset
        if isinstance(self.volume_missing_venues, Unset):
            volume_missing_venues = UNSET
        else:
            volume_missing_venues = self.volume_missing_venues

        market_cap_fiat: float | None | Unset
        if isinstance(self.market_cap_fiat, Unset):
            market_cap_fiat = UNSET
        else:
            market_cap_fiat = self.market_cap_fiat

        market_cap_change_24_h: float | None | Unset
        if isinstance(self.market_cap_change_24_h, Unset):
            market_cap_change_24_h = UNSET
        else:
            market_cap_change_24_h = self.market_cap_change_24_h

        market_cap_suspect = self.market_cap_suspect

        supply_circulating: float | None | Unset
        if isinstance(self.supply_circulating, Unset):
            supply_circulating = UNSET
        else:
            supply_circulating = self.supply_circulating

        supply_total: float | None | Unset
        if isinstance(self.supply_total, Unset):
            supply_total = UNSET
        else:
            supply_total = self.supply_total

        price_updated_at: None | str | Unset
        if isinstance(self.price_updated_at, Unset):
            price_updated_at = UNSET
        elif isinstance(self.price_updated_at, datetime.datetime):
            price_updated_at = self.price_updated_at.isoformat()
        else:
            price_updated_at = self.price_updated_at

        price_age_hours: float | None | Unset
        if isinstance(self.price_age_hours, Unset):
            price_age_hours = UNSET
        else:
            price_age_hours = self.price_age_hours

        sparkline15m: list[float] | None | Unset
        if isinstance(self.sparkline15m, Unset):
            sparkline15m = UNSET
        elif isinstance(self.sparkline15m, list):
            sparkline15m = self.sparkline15m

        else:
            sparkline15m = self.sparkline15m

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "ucid": ucid,
                "slug": slug,
                "symbol": symbol,
                "name": name,
                "currentPrice": current_price,
                "priceStale": price_stale,
                "priceStaleAfterHours": price_stale_after_hours,
            }
        )
        if rank is not UNSET:
            field_dict["rank"] = rank
        if change1h is not UNSET:
            field_dict["change1h"] = change1h
        if change24h is not UNSET:
            field_dict["change24h"] = change24h
        if change7d is not UNSET:
            field_dict["change7d"] = change7d
        if high24h is not UNSET:
            field_dict["high24h"] = high24h
        if low24h is not UNSET:
            field_dict["low24h"] = low24h
        if volume24h is not UNSET:
            field_dict["volume24h"] = volume24h
        if volume_change_24_h is not UNSET:
            field_dict["volumeChange24h"] = volume_change_24_h
        if volume_missing_venues is not UNSET:
            field_dict["volumeMissingVenues"] = volume_missing_venues
        if market_cap_fiat is not UNSET:
            field_dict["marketCapFiat"] = market_cap_fiat
        if market_cap_change_24_h is not UNSET:
            field_dict["marketCapChange24h"] = market_cap_change_24_h
        if market_cap_suspect is not UNSET:
            field_dict["marketCapSuspect"] = market_cap_suspect
        if supply_circulating is not UNSET:
            field_dict["supplyCirculating"] = supply_circulating
        if supply_total is not UNSET:
            field_dict["supplyTotal"] = supply_total
        if price_updated_at is not UNSET:
            field_dict["priceUpdatedAt"] = price_updated_at
        if price_age_hours is not UNSET:
            field_dict["priceAgeHours"] = price_age_hours
        if sparkline15m is not UNSET:
            field_dict["sparkline15m"] = sparkline15m

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        ucid = d.pop("ucid")

        slug = d.pop("slug")

        symbol = d.pop("symbol")

        name = d.pop("name")

        current_price = d.pop("currentPrice")

        price_stale = d.pop("priceStale")

        price_stale_after_hours = d.pop("priceStaleAfterHours")

        def _parse_rank(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        rank = _parse_rank(d.pop("rank", UNSET))

        def _parse_change1h(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        change1h = _parse_change1h(d.pop("change1h", UNSET))

        def _parse_change24h(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        change24h = _parse_change24h(d.pop("change24h", UNSET))

        def _parse_change7d(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        change7d = _parse_change7d(d.pop("change7d", UNSET))

        def _parse_high24h(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        high24h = _parse_high24h(d.pop("high24h", UNSET))

        def _parse_low24h(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        low24h = _parse_low24h(d.pop("low24h", UNSET))

        def _parse_volume24h(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        volume24h = _parse_volume24h(d.pop("volume24h", UNSET))

        def _parse_volume_change_24_h(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        volume_change_24_h = _parse_volume_change_24_h(d.pop("volumeChange24h", UNSET))

        def _parse_volume_missing_venues(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        volume_missing_venues = _parse_volume_missing_venues(d.pop("volumeMissingVenues", UNSET))

        def _parse_market_cap_fiat(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        market_cap_fiat = _parse_market_cap_fiat(d.pop("marketCapFiat", UNSET))

        def _parse_market_cap_change_24_h(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        market_cap_change_24_h = _parse_market_cap_change_24_h(d.pop("marketCapChange24h", UNSET))

        market_cap_suspect = d.pop("marketCapSuspect", UNSET)

        def _parse_supply_circulating(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        supply_circulating = _parse_supply_circulating(d.pop("supplyCirculating", UNSET))

        def _parse_supply_total(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        supply_total = _parse_supply_total(d.pop("supplyTotal", UNSET))

        def _parse_price_updated_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                price_updated_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return price_updated_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        price_updated_at = _parse_price_updated_at(d.pop("priceUpdatedAt", UNSET))

        def _parse_price_age_hours(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        price_age_hours = _parse_price_age_hours(d.pop("priceAgeHours", UNSET))

        def _parse_sparkline15m(data: object) -> list[float] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                sparkline15m_type_0 = cast(list[float], data)

                return sparkline15m_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[float] | None | Unset, data)

        sparkline15m = _parse_sparkline15m(d.pop("sparkline15m", UNSET))

        public_live_price_row = cls(
            ucid=ucid,
            slug=slug,
            symbol=symbol,
            name=name,
            current_price=current_price,
            price_stale=price_stale,
            price_stale_after_hours=price_stale_after_hours,
            rank=rank,
            change1h=change1h,
            change24h=change24h,
            change7d=change7d,
            high24h=high24h,
            low24h=low24h,
            volume24h=volume24h,
            volume_change_24_h=volume_change_24_h,
            volume_missing_venues=volume_missing_venues,
            market_cap_fiat=market_cap_fiat,
            market_cap_change_24_h=market_cap_change_24_h,
            market_cap_suspect=market_cap_suspect,
            supply_circulating=supply_circulating,
            supply_total=supply_total,
            price_updated_at=price_updated_at,
            price_age_hours=price_age_hours,
            sparkline15m=sparkline15m,
        )

        public_live_price_row.additional_properties = d
        return public_live_price_row

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
