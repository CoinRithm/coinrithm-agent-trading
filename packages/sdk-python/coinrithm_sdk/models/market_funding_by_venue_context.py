from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.market_funding_venue_rate import MarketFundingVenueRate


T = TypeVar("T", bound="MarketFundingByVenueContext")


@_attrs_define
class MarketFundingByVenueContext:
    """Independent venue collection clocks; available only with usable additional context within the bounded two-hour read.
    Does not change the top-level funding reference or futures entry gate. Not simultaneous prices or an
    arbitrage/return forecast.

        Attributes:
            rates (list[MarketFundingVenueRate]):
            same_time (bool):
            note (str):
    """

    rates: list[MarketFundingVenueRate]
    same_time: bool
    note: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        rates = []
        for rates_item_data in self.rates:
            rates_item = rates_item_data.to_dict()
            rates.append(rates_item)

        same_time = self.same_time

        note = self.note

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "rates": rates,
                "sameTime": same_time,
                "note": note,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.market_funding_venue_rate import MarketFundingVenueRate

        d = dict(src_dict)
        rates = []
        _rates = d.pop("rates")
        for rates_item_data in _rates:
            rates_item = MarketFundingVenueRate.from_dict(rates_item_data)

            rates.append(rates_item)

        same_time = d.pop("sameTime")

        note = d.pop("note")

        market_funding_by_venue_context = cls(
            rates=rates,
            same_time=same_time,
            note=note,
        )

        market_funding_by_venue_context.additional_properties = d
        return market_funding_by_venue_context

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
