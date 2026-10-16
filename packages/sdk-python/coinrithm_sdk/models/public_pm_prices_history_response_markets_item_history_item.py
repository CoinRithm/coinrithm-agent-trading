from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicPmPricesHistoryResponseMarketsItemHistoryItem")


@_attrs_define
class PublicPmPricesHistoryResponseMarketsItemHistoryItem:
    """
    Attributes:
        t (int): Unix time. SECONDS for Polymarket; MILLISECONDS for Kalshi and the stored-history venues.
        p (float): Probability 0..1.
    """

    t: int
    p: float
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        t = self.t

        p = self.p

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "t": t,
                "p": p,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        t = d.pop("t")

        p = d.pop("p")

        public_pm_prices_history_response_markets_item_history_item = cls(
            t=t,
            p=p,
        )

        public_pm_prices_history_response_markets_item_history_item.additional_properties = d
        return public_pm_prices_history_response_markets_item_history_item

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
