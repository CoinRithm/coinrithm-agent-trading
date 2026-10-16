from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_pm_prices_history_response_markets_item_history_source import (
    PublicPmPricesHistoryResponseMarketsItemHistorySource,
)
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_prices_history_response_markets_item_history_item import (
        PublicPmPricesHistoryResponseMarketsItemHistoryItem,
    )


T = TypeVar("T", bound="PublicPmPricesHistoryResponseMarketsItem")


@_attrs_define
class PublicPmPricesHistoryResponseMarketsItem:
    """
    Attributes:
        market (str): The requested venue market id (Polymarket CLOB token id or Kalshi ticker).
        history (list[PublicPmPricesHistoryResponseMarketsItemHistoryItem]): Oldest first.
        history_source (PublicPmPricesHistoryResponseMarketsItemHistorySource | Unset): Present only when the venue
            failed and this series comes from CoinRithm's stored price snapshots instead of the live venue history.
        as_of (datetime.datetime | Unset): Time of the last stored point; present with `historySource`.
    """

    market: str
    history: list[PublicPmPricesHistoryResponseMarketsItemHistoryItem]
    history_source: PublicPmPricesHistoryResponseMarketsItemHistorySource | Unset = UNSET
    as_of: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        market = self.market

        history = []
        for history_item_data in self.history:
            history_item = history_item_data.to_dict()
            history.append(history_item)

        history_source: str | Unset = UNSET
        if not isinstance(self.history_source, Unset):
            history_source = self.history_source.value

        as_of: str | Unset = UNSET
        if not isinstance(self.as_of, Unset):
            as_of = self.as_of.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "market": market,
                "history": history,
            }
        )
        if history_source is not UNSET:
            field_dict["historySource"] = history_source
        if as_of is not UNSET:
            field_dict["asOf"] = as_of

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_prices_history_response_markets_item_history_item import (
            PublicPmPricesHistoryResponseMarketsItemHistoryItem,
        )

        d = dict(src_dict)
        market = d.pop("market")

        history = []
        _history = d.pop("history")
        for history_item_data in _history:
            history_item = PublicPmPricesHistoryResponseMarketsItemHistoryItem.from_dict(history_item_data)

            history.append(history_item)

        _history_source = d.pop("historySource", UNSET)
        history_source: PublicPmPricesHistoryResponseMarketsItemHistorySource | Unset
        if isinstance(_history_source, Unset):
            history_source = UNSET
        else:
            history_source = PublicPmPricesHistoryResponseMarketsItemHistorySource(_history_source)

        _as_of = d.pop("asOf", UNSET)
        as_of: datetime.datetime | Unset
        if isinstance(_as_of, Unset):
            as_of = UNSET
        else:
            as_of = datetime.datetime.fromisoformat(_as_of.replace("Z", "+00:00"))

        public_pm_prices_history_response_markets_item = cls(
            market=market,
            history=history,
            history_source=history_source,
            as_of=as_of,
        )

        public_pm_prices_history_response_markets_item.additional_properties = d
        return public_pm_prices_history_response_markets_item

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
