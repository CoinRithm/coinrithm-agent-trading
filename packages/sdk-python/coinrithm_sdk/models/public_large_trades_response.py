from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_large_trade import PublicLargeTrade
    from ..models.public_large_trades_filters import PublicLargeTradesFilters
    from ..models.public_market_feed_source import PublicMarketFeedSource


T = TypeVar("T", bound="PublicLargeTradesResponse")


@_attrs_define
class PublicLargeTradesResponse:
    """
    Attributes:
        version (int): Response schema version (1).
        generated_at (datetime.datetime):
        filters (PublicLargeTradesFilters):
        count (int):
        items (list[PublicLargeTrade]): Newest first.
        source (PublicMarketFeedSource):
    """

    version: int
    generated_at: datetime.datetime
    filters: PublicLargeTradesFilters
    count: int
    items: list[PublicLargeTrade]
    source: PublicMarketFeedSource
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        version = self.version

        generated_at = self.generated_at.isoformat()

        filters = self.filters.to_dict()

        count = self.count

        items = []
        for items_item_data in self.items:
            items_item = items_item_data.to_dict()
            items.append(items_item)

        source = self.source.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "version": version,
                "generatedAt": generated_at,
                "filters": filters,
                "count": count,
                "items": items,
                "source": source,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_large_trade import PublicLargeTrade
        from ..models.public_large_trades_filters import PublicLargeTradesFilters
        from ..models.public_market_feed_source import PublicMarketFeedSource

        d = dict(src_dict)
        version = d.pop("version")

        generated_at = datetime.datetime.fromisoformat(d.pop("generatedAt").replace("Z", "+00:00"))

        filters = PublicLargeTradesFilters.from_dict(d.pop("filters"))

        count = d.pop("count")

        items = []
        _items = d.pop("items")
        for items_item_data in _items:
            items_item = PublicLargeTrade.from_dict(items_item_data)

            items.append(items_item)

        source = PublicMarketFeedSource.from_dict(d.pop("source"))

        public_large_trades_response = cls(
            version=version,
            generated_at=generated_at,
            filters=filters,
            count=count,
            items=items,
            source=source,
        )

        public_large_trades_response.additional_properties = d
        return public_large_trades_response

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
