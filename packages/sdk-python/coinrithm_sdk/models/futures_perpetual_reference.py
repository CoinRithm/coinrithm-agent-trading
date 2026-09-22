from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="FuturesPerpetualReference")


@_attrs_define
class FuturesPerpetualReference:
    """Current venue/contract reference for a coin. Historical funding charges remain on funding ledger events.

    Attributes:
        listed (bool): Whether a covered venue reference is currently known.
        venue (None | str): Current funding venue identifier, such as binance, bybit, or gateio.
        symbol (None | str): Current venue perpetual symbol.
        funding_interval_hours (int | None): Current venue funding interval in hours.
    """

    listed: bool
    venue: None | str
    symbol: None | str
    funding_interval_hours: int | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        listed = self.listed

        venue: None | str
        venue = self.venue

        symbol: None | str
        symbol = self.symbol

        funding_interval_hours: int | None
        funding_interval_hours = self.funding_interval_hours

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "listed": listed,
                "venue": venue,
                "symbol": symbol,
                "fundingIntervalHours": funding_interval_hours,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        listed = d.pop("listed")

        def _parse_venue(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        venue = _parse_venue(d.pop("venue"))

        def _parse_symbol(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        symbol = _parse_symbol(d.pop("symbol"))

        def _parse_funding_interval_hours(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        funding_interval_hours = _parse_funding_interval_hours(d.pop("fundingIntervalHours"))

        futures_perpetual_reference = cls(
            listed=listed,
            venue=venue,
            symbol=symbol,
            funding_interval_hours=funding_interval_hours,
        )

        futures_perpetual_reference.additional_properties = d
        return futures_perpetual_reference

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
