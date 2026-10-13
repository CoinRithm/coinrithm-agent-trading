from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicTickerTreasuryHolding")


@_attrs_define
class PublicTickerTreasuryHolding:
    """
    Attributes:
        coin (str):
        holdings (float):
        value_usd (float):
        pct_of_supply (float):
    """

    coin: str
    holdings: float
    value_usd: float
    pct_of_supply: float
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        coin = self.coin

        holdings = self.holdings

        value_usd = self.value_usd

        pct_of_supply = self.pct_of_supply

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "coin": coin,
                "holdings": holdings,
                "valueUsd": value_usd,
                "pctOfSupply": pct_of_supply,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        coin = d.pop("coin")

        holdings = d.pop("holdings")

        value_usd = d.pop("valueUsd")

        pct_of_supply = d.pop("pctOfSupply")

        public_ticker_treasury_holding = cls(
            coin=coin,
            holdings=holdings,
            value_usd=value_usd,
            pct_of_supply=pct_of_supply,
        )

        public_ticker_treasury_holding.additional_properties = d
        return public_ticker_treasury_holding

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
