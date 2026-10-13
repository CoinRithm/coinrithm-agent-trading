from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_ticker_treasury_holding import PublicTickerTreasuryHolding


T = TypeVar("T", bound="PublicTickerTreasury")


@_attrs_define
class PublicTickerTreasury:
    """
    Attributes:
        name (str):
        symbol (None | str):
        country (None | str):
        holdings (list[PublicTickerTreasuryHolding]):
    """

    name: str
    symbol: None | str
    country: None | str
    holdings: list[PublicTickerTreasuryHolding]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        symbol: None | str
        symbol = self.symbol

        country: None | str
        country = self.country

        holdings = []
        for holdings_item_data in self.holdings:
            holdings_item = holdings_item_data.to_dict()
            holdings.append(holdings_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "symbol": symbol,
                "country": country,
                "holdings": holdings,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_ticker_treasury_holding import PublicTickerTreasuryHolding

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

        holdings = []
        _holdings = d.pop("holdings")
        for holdings_item_data in _holdings:
            holdings_item = PublicTickerTreasuryHolding.from_dict(holdings_item_data)

            holdings.append(holdings_item)

        public_ticker_treasury = cls(
            name=name,
            symbol=symbol,
            country=country,
            holdings=holdings,
        )

        public_ticker_treasury.additional_properties = d
        return public_ticker_treasury

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
