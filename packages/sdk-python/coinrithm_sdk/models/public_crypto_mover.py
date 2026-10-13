from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicCryptoMover")


@_attrs_define
class PublicCryptoMover:
    """One row of the top-gainers / top-losers universe scan. `change24h` and
    `currentPrice` come from numeric DB columns and serialize as decimal
    STRINGS — parse before comparing.

        Attributes:
            ucid (str): CoinRithm coin id. This is the SAME identifier the agent endpoints
                call `coinId`; pass it straight through rather than resolving the
                symbol (symbols collide across listings).
            symbol (str):
            name (str):
            slug (str): Public site slug (https://www.coinrithm.com/en/cryptocurrencies/{slug}).
            change24h (str): 24h price change in PERCENT, as a decimal string. Negative on the losers feed.
            current_price (str): Latest USD price as a decimal string.
            price_updated_at (datetime.datetime | None | Unset): When the live price was last written; null when unknown.
            price_age_hours (float | None | Unset): Hours since the live price was last written, one decimal; null when
                unknown.
            price_stale (bool | Unset): True when the last live write is older than `priceStaleAfterHours`. The price stays
                in the row; treat it as a last known price.
            price_stale_after_hours (float | Unset): Staleness threshold in hours (currently 72).
    """

    ucid: str
    symbol: str
    name: str
    slug: str
    change24h: str
    current_price: str
    price_updated_at: datetime.datetime | None | Unset = UNSET
    price_age_hours: float | None | Unset = UNSET
    price_stale: bool | Unset = UNSET
    price_stale_after_hours: float | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        ucid = self.ucid

        symbol = self.symbol

        name = self.name

        slug = self.slug

        change24h = self.change24h

        current_price = self.current_price

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

        price_stale = self.price_stale

        price_stale_after_hours = self.price_stale_after_hours

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "ucid": ucid,
                "symbol": symbol,
                "name": name,
                "slug": slug,
                "change24h": change24h,
                "currentPrice": current_price,
            }
        )
        if price_updated_at is not UNSET:
            field_dict["priceUpdatedAt"] = price_updated_at
        if price_age_hours is not UNSET:
            field_dict["priceAgeHours"] = price_age_hours
        if price_stale is not UNSET:
            field_dict["priceStale"] = price_stale
        if price_stale_after_hours is not UNSET:
            field_dict["priceStaleAfterHours"] = price_stale_after_hours

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        ucid = d.pop("ucid")

        symbol = d.pop("symbol")

        name = d.pop("name")

        slug = d.pop("slug")

        change24h = d.pop("change24h")

        current_price = d.pop("currentPrice")

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

        price_stale = d.pop("priceStale", UNSET)

        price_stale_after_hours = d.pop("priceStaleAfterHours", UNSET)

        public_crypto_mover = cls(
            ucid=ucid,
            symbol=symbol,
            name=name,
            slug=slug,
            change24h=change24h,
            current_price=current_price,
            price_updated_at=price_updated_at,
            price_age_hours=price_age_hours,
            price_stale=price_stale,
            price_stale_after_hours=price_stale_after_hours,
        )

        return public_crypto_mover
