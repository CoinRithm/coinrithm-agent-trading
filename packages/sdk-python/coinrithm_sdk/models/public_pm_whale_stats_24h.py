from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_whale_stats_24h_by_source_item import PublicPmWhaleStats24HBySourceItem
    from ..models.public_pm_whale_stats_24h_max_trade_type_0 import PublicPmWhaleStats24HMaxTradeType0


T = TypeVar("T", bound="PublicPmWhaleStats24H")


@_attrs_define
class PublicPmWhaleStats24H:
    """Trailing 24-hour aggregates over the full verified whale table, not only the 50-row tape.

    Attributes:
        count (int):
        total_usd (float):
        max_usd (float):
        by_source (list[PublicPmWhaleStats24HBySourceItem]):
        max_trade (None | PublicPmWhaleStats24HMaxTradeType0 | Unset): The largest matched print. Verify `usdValue`
            against `maxUsd` before calling it the maximum; an unmatched print can exceed it.
    """

    count: int
    total_usd: float
    max_usd: float
    by_source: list[PublicPmWhaleStats24HBySourceItem]
    max_trade: None | PublicPmWhaleStats24HMaxTradeType0 | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_pm_whale_stats_24h_max_trade_type_0 import PublicPmWhaleStats24HMaxTradeType0

        count = self.count

        total_usd = self.total_usd

        max_usd = self.max_usd

        by_source = []
        for by_source_item_data in self.by_source:
            by_source_item = by_source_item_data.to_dict()
            by_source.append(by_source_item)

        max_trade: dict[str, Any] | None | Unset
        if isinstance(self.max_trade, Unset):
            max_trade = UNSET
        elif isinstance(self.max_trade, PublicPmWhaleStats24HMaxTradeType0):
            max_trade = self.max_trade.to_dict()
        else:
            max_trade = self.max_trade

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "count": count,
                "totalUsd": total_usd,
                "maxUsd": max_usd,
                "bySource": by_source,
            }
        )
        if max_trade is not UNSET:
            field_dict["maxTrade"] = max_trade

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_whale_stats_24h_by_source_item import PublicPmWhaleStats24HBySourceItem
        from ..models.public_pm_whale_stats_24h_max_trade_type_0 import PublicPmWhaleStats24HMaxTradeType0

        d = dict(src_dict)
        count = d.pop("count")

        total_usd = d.pop("totalUsd")

        max_usd = d.pop("maxUsd")

        by_source = []
        _by_source = d.pop("bySource")
        for by_source_item_data in _by_source:
            by_source_item = PublicPmWhaleStats24HBySourceItem.from_dict(by_source_item_data)

            by_source.append(by_source_item)

        def _parse_max_trade(data: object) -> None | PublicPmWhaleStats24HMaxTradeType0 | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                max_trade_type_0 = PublicPmWhaleStats24HMaxTradeType0.from_dict(data)

                return max_trade_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicPmWhaleStats24HMaxTradeType0 | Unset, data)

        max_trade = _parse_max_trade(d.pop("maxTrade", UNSET))

        public_pm_whale_stats_24h = cls(
            count=count,
            total_usd=total_usd,
            max_usd=max_usd,
            by_source=by_source,
            max_trade=max_trade,
        )

        public_pm_whale_stats_24h.additional_properties = d
        return public_pm_whale_stats_24h

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
