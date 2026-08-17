from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="GetPublicPredictionMarketPriceHistoryResponse200MarketsItemHistoryItem")


@_attrs_define
class GetPublicPredictionMarketPriceHistoryResponse200MarketsItemHistoryItem:
    """
    Attributes:
        t (int | Unset): Unix ms
        p (float | Unset): Probability 0..1
    """

    t: int | Unset = UNSET
    p: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        t = self.t

        p = self.p

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if t is not UNSET:
            field_dict["t"] = t
        if p is not UNSET:
            field_dict["p"] = p

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        t = d.pop("t", UNSET)

        p = d.pop("p", UNSET)

        get_public_prediction_market_price_history_response_200_markets_item_history_item = cls(
            t=t,
            p=p,
        )

        get_public_prediction_market_price_history_response_200_markets_item_history_item.additional_properties = d
        return get_public_prediction_market_price_history_response_200_markets_item_history_item

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
