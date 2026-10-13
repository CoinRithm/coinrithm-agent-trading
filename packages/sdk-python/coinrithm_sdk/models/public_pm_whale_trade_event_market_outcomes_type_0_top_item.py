from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmWhaleTradeEventMarketOutcomesType0TopItem")


@_attrs_define
class PublicPmWhaleTradeEventMarketOutcomesType0TopItem:
    """
    Attributes:
        name (str | Unset):
        probability (float | Unset):
    """

    name: str | Unset = UNSET
    probability: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        probability = self.probability

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if name is not UNSET:
            field_dict["name"] = name
        if probability is not UNSET:
            field_dict["probability"] = probability

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name", UNSET)

        probability = d.pop("probability", UNSET)

        public_pm_whale_trade_event_market_outcomes_type_0_top_item = cls(
            name=name,
            probability=probability,
        )

        public_pm_whale_trade_event_market_outcomes_type_0_top_item.additional_properties = d
        return public_pm_whale_trade_event_market_outcomes_type_0_top_item

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
