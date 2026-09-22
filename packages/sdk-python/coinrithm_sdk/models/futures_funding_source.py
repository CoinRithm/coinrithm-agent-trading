from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="FuturesFundingSource")


@_attrs_define
class FuturesFundingSource:
    """Current venue/contract funding reference. Historical charges are represented by funding events.

    Attributes:
        venue (str): Current funding venue identifier.
        symbol (str): Current venue perpetual symbol.
        funding_interval_hours (int): Current venue funding interval in hours.
    """

    venue: str
    symbol: str
    funding_interval_hours: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        venue = self.venue

        symbol = self.symbol

        funding_interval_hours = self.funding_interval_hours

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "venue": venue,
                "symbol": symbol,
                "fundingIntervalHours": funding_interval_hours,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        venue = d.pop("venue")

        symbol = d.pop("symbol")

        funding_interval_hours = d.pop("fundingIntervalHours")

        futures_funding_source = cls(
            venue=venue,
            symbol=symbol,
            funding_interval_hours=funding_interval_hours,
        )

        futures_funding_source.additional_properties = d
        return futures_funding_source

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
