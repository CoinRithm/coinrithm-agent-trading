from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="MarketMacroQuote")


@_attrs_define
class MarketMacroQuote:
    """
    Attributes:
        symbol (str): Provider perpetual identifier.
        label (str):
        kind (str): Currently index, commodity, fx or rates; not a closed enumeration.
        price (float): Provider derivative price in the quoted instrument's units; not a spot-market price.
        change_24_h_pct (float | None): Percent change from the stored previous-day price, rounded to two decimals; null
            without a valid positive base.
        as_of (datetime.datetime): Provider time of the latest traded minute; times more than 60 seconds ahead are
            rejected.
        age_seconds (int): Rounded provider age, clamped at zero.
        stale (bool): True when ageSeconds exceeds 3600 (one hour).
    """

    symbol: str
    label: str
    kind: str
    price: float
    change_24_h_pct: float | None
    as_of: datetime.datetime
    age_seconds: int
    stale: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        symbol = self.symbol

        label = self.label

        kind = self.kind

        price = self.price

        change_24_h_pct: float | None
        change_24_h_pct = self.change_24_h_pct

        as_of = self.as_of.isoformat()

        age_seconds = self.age_seconds

        stale = self.stale

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "symbol": symbol,
                "label": label,
                "kind": kind,
                "price": price,
                "change24hPct": change_24_h_pct,
                "asOf": as_of,
                "ageSeconds": age_seconds,
                "stale": stale,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        symbol = d.pop("symbol")

        label = d.pop("label")

        kind = d.pop("kind")

        price = d.pop("price")

        def _parse_change_24_h_pct(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        change_24_h_pct = _parse_change_24_h_pct(d.pop("change24hPct"))

        as_of = datetime.datetime.fromisoformat(d.pop("asOf").replace("Z", "+00:00"))

        age_seconds = d.pop("ageSeconds")

        stale = d.pop("stale")

        market_macro_quote = cls(
            symbol=symbol,
            label=label,
            kind=kind,
            price=price,
            change_24_h_pct=change_24_h_pct,
            as_of=as_of,
            age_seconds=age_seconds,
            stale=stale,
        )

        market_macro_quote.additional_properties = d
        return market_macro_quote

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
