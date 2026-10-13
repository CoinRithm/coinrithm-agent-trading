from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicMarketFeedVenue")


@_attrs_define
class PublicMarketFeedVenue:
    """
    Attributes:
        venue (str):
        name (str):
        url (str):
        feed (str): The venue's public feed the collector reads.
        note (str | Unset): Venue-specific coverage limitation, when published.
    """

    venue: str
    name: str
    url: str
    feed: str
    note: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        venue = self.venue

        name = self.name

        url = self.url

        feed = self.feed

        note = self.note

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "venue": venue,
                "name": name,
                "url": url,
                "feed": feed,
            }
        )
        if note is not UNSET:
            field_dict["note"] = note

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        venue = d.pop("venue")

        name = d.pop("name")

        url = d.pop("url")

        feed = d.pop("feed")

        note = d.pop("note", UNSET)

        public_market_feed_venue = cls(
            venue=venue,
            name=name,
            url=url,
            feed=feed,
            note=note,
        )

        public_market_feed_venue.additional_properties = d
        return public_market_feed_venue

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
