from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_whale_trade_event_market_outcomes_type_0_top_item import (
        PublicPmWhaleTradeEventMarketOutcomesType0TopItem,
    )


T = TypeVar("T", bound="PublicPmWhaleTradeEventMarketOutcomesType0")


@_attrs_define
class PublicPmWhaleTradeEventMarketOutcomesType0:
    """Outcome count and the top outcomes by probability, for a market-split display.

    Attributes:
        total (int | Unset):
        top (list[PublicPmWhaleTradeEventMarketOutcomesType0TopItem] | Unset):
    """

    total: int | Unset = UNSET
    top: list[PublicPmWhaleTradeEventMarketOutcomesType0TopItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        total = self.total

        top: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.top, Unset):
            top = []
            for top_item_data in self.top:
                top_item = top_item_data.to_dict()
                top.append(top_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if total is not UNSET:
            field_dict["total"] = total
        if top is not UNSET:
            field_dict["top"] = top

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_whale_trade_event_market_outcomes_type_0_top_item import (
            PublicPmWhaleTradeEventMarketOutcomesType0TopItem,
        )

        d = dict(src_dict)
        total = d.pop("total", UNSET)

        _top = d.pop("top", UNSET)
        top: list[PublicPmWhaleTradeEventMarketOutcomesType0TopItem] | Unset = UNSET
        if _top is not UNSET:
            top = []
            for top_item_data in _top:
                top_item = PublicPmWhaleTradeEventMarketOutcomesType0TopItem.from_dict(top_item_data)

                top.append(top_item)

        public_pm_whale_trade_event_market_outcomes_type_0 = cls(
            total=total,
            top=top,
        )

        public_pm_whale_trade_event_market_outcomes_type_0.additional_properties = d
        return public_pm_whale_trade_event_market_outcomes_type_0

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
