from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicCryptoTreasuryCompany")


@_attrs_define
class PublicCryptoTreasuryCompany:
    """
    Attributes:
        name (str):
        symbol (None | str): Upstream listing symbol such as `MSTR.US` or `3350.T`; null when unlisted upstream.
        country (None | str): ISO 3166-1 alpha-2 code, or null.
        holdings (float): Coins held.
        value_usd (float): Current value of the holding in USD.
        pct_of_supply (float): Percent of the coin's total supply.
        tradfi_ticker (None | str): CoinRithm TradFi reference ticker for US listings in the catalog, else null.
    """

    name: str
    symbol: None | str
    country: None | str
    holdings: float
    value_usd: float
    pct_of_supply: float
    tradfi_ticker: None | str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        symbol: None | str
        symbol = self.symbol

        country: None | str
        country = self.country

        holdings = self.holdings

        value_usd = self.value_usd

        pct_of_supply = self.pct_of_supply

        tradfi_ticker: None | str
        tradfi_ticker = self.tradfi_ticker

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "symbol": symbol,
                "country": country,
                "holdings": holdings,
                "valueUsd": value_usd,
                "pctOfSupply": pct_of_supply,
                "tradfiTicker": tradfi_ticker,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        def _parse_symbol(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        symbol = _parse_symbol(d.pop("symbol"))

        def _parse_country(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        country = _parse_country(d.pop("country"))

        holdings = d.pop("holdings")

        value_usd = d.pop("valueUsd")

        pct_of_supply = d.pop("pctOfSupply")

        def _parse_tradfi_ticker(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        tradfi_ticker = _parse_tradfi_ticker(d.pop("tradfiTicker"))

        public_crypto_treasury_company = cls(
            name=name,
            symbol=symbol,
            country=country,
            holdings=holdings,
            value_usd=value_usd,
            pct_of_supply=pct_of_supply,
            tradfi_ticker=tradfi_ticker,
        )

        public_crypto_treasury_company.additional_properties = d
        return public_crypto_treasury_company

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
