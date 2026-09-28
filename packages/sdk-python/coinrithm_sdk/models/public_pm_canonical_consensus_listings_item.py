from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="PublicPmCanonicalConsensusListingsItem")


@_attrs_define
class PublicPmCanonicalConsensusListingsItem:
    """
    Attributes:
        source (str):
        event_slug (str):
    """

    source: str
    event_slug: str

    def to_dict(self) -> dict[str, Any]:
        source = self.source

        event_slug = self.event_slug

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "source": source,
                "eventSlug": event_slug,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        source = d.pop("source")

        event_slug = d.pop("eventSlug")

        public_pm_canonical_consensus_listings_item = cls(
            source=source,
            event_slug=event_slug,
        )

        return public_pm_canonical_consensus_listings_item
