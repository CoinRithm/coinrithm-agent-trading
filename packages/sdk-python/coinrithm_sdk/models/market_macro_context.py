from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.market_macro_quote import MarketMacroQuote


T = TypeVar("T", bound="MarketMacroContext")


@_attrs_define
class MarketMacroContext:
    """Optional on older APIs; null without usable quotes. Curated Hyperliquid
    xyz perpetuals tracking indices, commodities, FX and rates around the
    clock are derivative proxies, not underlying exchange quotes. Each
    quote has its own time; the block is market-wide, not coin-specific.

        Attributes:
            note (str): Source and derivative-proxy limitations.
            quotes (list[MarketMacroQuote]):
    """

    note: str
    quotes: list[MarketMacroQuote]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        note = self.note

        quotes = []
        for quotes_item_data in self.quotes:
            quotes_item = quotes_item_data.to_dict()
            quotes.append(quotes_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "note": note,
                "quotes": quotes,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.market_macro_quote import MarketMacroQuote

        d = dict(src_dict)
        note = d.pop("note")

        quotes = []
        _quotes = d.pop("quotes")
        for quotes_item_data in _quotes:
            quotes_item = MarketMacroQuote.from_dict(quotes_item_data)

            quotes.append(quotes_item)

        market_macro_context = cls(
            note=note,
            quotes=quotes,
        )

        market_macro_context.additional_properties = d
        return market_macro_context

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
