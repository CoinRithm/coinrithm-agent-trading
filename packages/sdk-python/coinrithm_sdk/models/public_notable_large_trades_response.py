from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_market_feed_source import PublicMarketFeedSource
    from ..models.public_notable_large_trade import PublicNotableLargeTrade
    from ..models.public_notable_large_trades_response_rules import PublicNotableLargeTradesResponseRules


T = TypeVar("T", bound="PublicNotableLargeTradesResponse")


@_attrs_define
class PublicNotableLargeTradesResponse:
    """
    Attributes:
        version (int): Response schema version (1).
        generated_at (datetime.datetime):
        stats_as_of (datetime.datetime): When the per-market distributions were computed (recomputed at most every 10
            minutes).
        rules (PublicNotableLargeTradesResponseRules): The selection rules in force.
        candidates_truncated (bool): True when the candidate row cap was reached.
        total_notable (int): Notable bursts before `limit`.
        count (int):
        items (list[PublicNotableLargeTrade]): Newest burst first.
        source (PublicMarketFeedSource):
    """

    version: int
    generated_at: datetime.datetime
    stats_as_of: datetime.datetime
    rules: PublicNotableLargeTradesResponseRules
    candidates_truncated: bool
    total_notable: int
    count: int
    items: list[PublicNotableLargeTrade]
    source: PublicMarketFeedSource
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        version = self.version

        generated_at = self.generated_at.isoformat()

        stats_as_of = self.stats_as_of.isoformat()

        rules = self.rules.to_dict()

        candidates_truncated = self.candidates_truncated

        total_notable = self.total_notable

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
                "statsAsOf": stats_as_of,
                "rules": rules,
                "candidatesTruncated": candidates_truncated,
                "totalNotable": total_notable,
                "count": count,
                "items": items,
                "source": source,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_market_feed_source import PublicMarketFeedSource
        from ..models.public_notable_large_trade import PublicNotableLargeTrade
        from ..models.public_notable_large_trades_response_rules import PublicNotableLargeTradesResponseRules

        d = dict(src_dict)
        version = d.pop("version")

        generated_at = datetime.datetime.fromisoformat(d.pop("generatedAt").replace("Z", "+00:00"))

        stats_as_of = datetime.datetime.fromisoformat(d.pop("statsAsOf").replace("Z", "+00:00"))

        rules = PublicNotableLargeTradesResponseRules.from_dict(d.pop("rules"))

        candidates_truncated = d.pop("candidatesTruncated")

        total_notable = d.pop("totalNotable")

        count = d.pop("count")

        items = []
        _items = d.pop("items")
        for items_item_data in _items:
            items_item = PublicNotableLargeTrade.from_dict(items_item_data)

            items.append(items_item)

        source = PublicMarketFeedSource.from_dict(d.pop("source"))

        public_notable_large_trades_response = cls(
            version=version,
            generated_at=generated_at,
            stats_as_of=stats_as_of,
            rules=rules,
            candidates_truncated=candidates_truncated,
            total_notable=total_notable,
            count=count,
            items=items,
            source=source,
        )

        public_notable_large_trades_response.additional_properties = d
        return public_notable_large_trades_response

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
