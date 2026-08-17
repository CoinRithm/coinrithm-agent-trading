from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.get_public_prediction_market_price_history_response_200_markets_item import (
        GetPublicPredictionMarketPriceHistoryResponse200MarketsItem,
    )


T = TypeVar("T", bound="GetPublicPredictionMarketPriceHistoryResponse200")


@_attrs_define
class GetPublicPredictionMarketPriceHistoryResponse200:
    """
    Attributes:
        markets (list[GetPublicPredictionMarketPriceHistoryResponse200MarketsItem] | Unset):
    """

    markets: list[GetPublicPredictionMarketPriceHistoryResponse200MarketsItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        markets: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.markets, Unset):
            markets = []
            for markets_item_data in self.markets:
                markets_item = markets_item_data.to_dict()
                markets.append(markets_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if markets is not UNSET:
            field_dict["markets"] = markets

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_public_prediction_market_price_history_response_200_markets_item import (
            GetPublicPredictionMarketPriceHistoryResponse200MarketsItem,
        )

        d = dict(src_dict)
        _markets = d.pop("markets", UNSET)
        markets: list[GetPublicPredictionMarketPriceHistoryResponse200MarketsItem] | Unset = UNSET
        if _markets is not UNSET:
            markets = []
            for markets_item_data in _markets:
                markets_item = GetPublicPredictionMarketPriceHistoryResponse200MarketsItem.from_dict(markets_item_data)

                markets.append(markets_item)

        get_public_prediction_market_price_history_response_200 = cls(
            markets=markets,
        )

        get_public_prediction_market_price_history_response_200.additional_properties = d
        return get_public_prediction_market_price_history_response_200

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
