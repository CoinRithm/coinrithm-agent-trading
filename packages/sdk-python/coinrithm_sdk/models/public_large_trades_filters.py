from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicLargeTradesFilters")


@_attrs_define
class PublicLargeTradesFilters:
    """
    Attributes:
        symbol (None | str): Canonical symbol or base filter applied, or null.
        venue (None | str):
        asset_class (None | str):
        limit (int):
    """

    symbol: None | str
    venue: None | str
    asset_class: None | str
    limit: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        symbol: None | str
        symbol = self.symbol

        venue: None | str
        venue = self.venue

        asset_class: None | str
        asset_class = self.asset_class

        limit = self.limit

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "symbol": symbol,
                "venue": venue,
                "assetClass": asset_class,
                "limit": limit,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_symbol(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        symbol = _parse_symbol(d.pop("symbol"))

        def _parse_venue(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        venue = _parse_venue(d.pop("venue"))

        def _parse_asset_class(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        asset_class = _parse_asset_class(d.pop("assetClass"))

        limit = d.pop("limit")

        public_large_trades_filters = cls(
            symbol=symbol,
            venue=venue,
            asset_class=asset_class,
            limit=limit,
        )

        public_large_trades_filters.additional_properties = d
        return public_large_trades_filters

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
