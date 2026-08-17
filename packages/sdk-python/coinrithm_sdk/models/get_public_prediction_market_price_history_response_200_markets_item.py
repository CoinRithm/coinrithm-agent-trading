from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.get_public_prediction_market_price_history_response_200_markets_item_history_item import (
        GetPublicPredictionMarketPriceHistoryResponse200MarketsItemHistoryItem,
    )


T = TypeVar("T", bound="GetPublicPredictionMarketPriceHistoryResponse200MarketsItem")


@_attrs_define
class GetPublicPredictionMarketPriceHistoryResponse200MarketsItem:
    """
    Attributes:
        market (str | Unset):
        history (list[GetPublicPredictionMarketPriceHistoryResponse200MarketsItemHistoryItem] | Unset):
    """

    market: str | Unset = UNSET
    history: list[GetPublicPredictionMarketPriceHistoryResponse200MarketsItemHistoryItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        market = self.market

        history: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.history, Unset):
            history = []
            for history_item_data in self.history:
                history_item = history_item_data.to_dict()
                history.append(history_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if market is not UNSET:
            field_dict["market"] = market
        if history is not UNSET:
            field_dict["history"] = history

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_public_prediction_market_price_history_response_200_markets_item_history_item import (
            GetPublicPredictionMarketPriceHistoryResponse200MarketsItemHistoryItem,
        )

        d = dict(src_dict)
        market = d.pop("market", UNSET)

        _history = d.pop("history", UNSET)
        history: list[GetPublicPredictionMarketPriceHistoryResponse200MarketsItemHistoryItem] | Unset = UNSET
        if _history is not UNSET:
            history = []
            for history_item_data in _history:
                history_item = GetPublicPredictionMarketPriceHistoryResponse200MarketsItemHistoryItem.from_dict(
                    history_item_data
                )

                history.append(history_item)

        get_public_prediction_market_price_history_response_200_markets_item = cls(
            market=market,
            history=history,
        )

        get_public_prediction_market_price_history_response_200_markets_item.additional_properties = d
        return get_public_prediction_market_price_history_response_200_markets_item

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
