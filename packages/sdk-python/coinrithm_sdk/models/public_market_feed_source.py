from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_market_feed_venue import PublicMarketFeedVenue


T = TypeVar("T", bound="PublicMarketFeedSource")


@_attrs_define
class PublicMarketFeedSource:
    """
    Attributes:
        provider (str):
        venues (list[PublicMarketFeedVenue]):
        method (str): How rows are selected and valued.
        coverage (str | Unset): Which markets are collected, and the gap caveat.
    """

    provider: str
    venues: list[PublicMarketFeedVenue]
    method: str
    coverage: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        provider = self.provider

        venues = []
        for venues_item_data in self.venues:
            venues_item = venues_item_data.to_dict()
            venues.append(venues_item)

        method = self.method

        coverage = self.coverage

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "provider": provider,
                "venues": venues,
                "method": method,
            }
        )
        if coverage is not UNSET:
            field_dict["coverage"] = coverage

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_market_feed_venue import PublicMarketFeedVenue

        d = dict(src_dict)
        provider = d.pop("provider")

        venues = []
        _venues = d.pop("venues")
        for venues_item_data in _venues:
            venues_item = PublicMarketFeedVenue.from_dict(venues_item_data)

            venues.append(venues_item)

        method = d.pop("method")

        coverage = d.pop("coverage", UNSET)

        public_market_feed_source = cls(
            provider=provider,
            venues=venues,
            method=method,
            coverage=coverage,
        )

        public_market_feed_source.additional_properties = d
        return public_market_feed_source

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
