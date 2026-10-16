from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_prices_history_response_freshness import PublicPmPricesHistoryResponseFreshness
    from ..models.public_pm_prices_history_response_markets_item import PublicPmPricesHistoryResponseMarketsItem


T = TypeVar("T", bound="PublicPmPricesHistoryResponse")


@_attrs_define
class PublicPmPricesHistoryResponse:
    """
    Attributes:
        interval (str): The `interval` as sent (default `1w`).
        markets (list[PublicPmPricesHistoryResponseMarketsItem]): One series per requested market that has points; a
            market with no points is left out.
        freshness (PublicPmPricesHistoryResponseFreshness | Unset): Present only when at least one series is stored, not
            live. Such a response is cached for at most 30 seconds.
    """

    interval: str
    markets: list[PublicPmPricesHistoryResponseMarketsItem]
    freshness: PublicPmPricesHistoryResponseFreshness | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        interval = self.interval

        markets = []
        for markets_item_data in self.markets:
            markets_item = markets_item_data.to_dict()
            markets.append(markets_item)

        freshness: dict[str, Any] | Unset = UNSET
        if not isinstance(self.freshness, Unset):
            freshness = self.freshness.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "interval": interval,
                "markets": markets,
            }
        )
        if freshness is not UNSET:
            field_dict["freshness"] = freshness

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_prices_history_response_freshness import PublicPmPricesHistoryResponseFreshness
        from ..models.public_pm_prices_history_response_markets_item import PublicPmPricesHistoryResponseMarketsItem

        d = dict(src_dict)
        interval = d.pop("interval")

        markets = []
        _markets = d.pop("markets")
        for markets_item_data in _markets:
            markets_item = PublicPmPricesHistoryResponseMarketsItem.from_dict(markets_item_data)

            markets.append(markets_item)

        _freshness = d.pop("freshness", UNSET)
        freshness: PublicPmPricesHistoryResponseFreshness | Unset
        if isinstance(_freshness, Unset):
            freshness = UNSET
        else:
            freshness = PublicPmPricesHistoryResponseFreshness.from_dict(_freshness)

        public_pm_prices_history_response = cls(
            interval=interval,
            markets=markets,
            freshness=freshness,
        )

        public_pm_prices_history_response.additional_properties = d
        return public_pm_prices_history_response

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
