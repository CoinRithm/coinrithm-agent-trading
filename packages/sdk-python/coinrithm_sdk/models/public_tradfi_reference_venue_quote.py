from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicTradfiReferenceVenueQuote")


@_attrs_define
class PublicTradfiReferenceVenueQuote:
    """
    Attributes:
        venue (str): `binance`, `bybit` or `gate`.
        symbol (str):
        label (str): The venue's own instrument label.
        asset_class (str):
        index_price (float):
        source_observed_at (datetime.datetime | None): Venue observation time; currently always null (not recorded).
    """

    venue: str
    symbol: str
    label: str
    asset_class: str
    index_price: float
    source_observed_at: datetime.datetime | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        venue = self.venue

        symbol = self.symbol

        label = self.label

        asset_class = self.asset_class

        index_price = self.index_price

        source_observed_at: None | str
        if isinstance(self.source_observed_at, datetime.datetime):
            source_observed_at = self.source_observed_at.isoformat()
        else:
            source_observed_at = self.source_observed_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "venue": venue,
                "symbol": symbol,
                "label": label,
                "assetClass": asset_class,
                "indexPrice": index_price,
                "sourceObservedAt": source_observed_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        venue = d.pop("venue")

        symbol = d.pop("symbol")

        label = d.pop("label")

        asset_class = d.pop("assetClass")

        index_price = d.pop("indexPrice")

        def _parse_source_observed_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                source_observed_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return source_observed_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        source_observed_at = _parse_source_observed_at(d.pop("sourceObservedAt"))

        public_tradfi_reference_venue_quote = cls(
            venue=venue,
            symbol=symbol,
            label=label,
            asset_class=asset_class,
            index_price=index_price,
            source_observed_at=source_observed_at,
        )

        public_tradfi_reference_venue_quote.additional_properties = d
        return public_tradfi_reference_venue_quote

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
