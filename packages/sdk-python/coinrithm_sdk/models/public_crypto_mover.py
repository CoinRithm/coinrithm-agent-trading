from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

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
    """

    ucid: str
    symbol: str
    name: str
    slug: str
    change24h: str
    current_price: str

    def to_dict(self) -> dict[str, Any]:
        ucid = self.ucid

        symbol = self.symbol

        name = self.name

        slug = self.slug

        change24h = self.change24h

        current_price = self.current_price

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

        public_crypto_mover = cls(
            ucid=ucid,
            symbol=symbol,
            name=name,
            slug=slug,
            change24h=change24h,
            current_price=current_price,
        )

        return public_crypto_mover
