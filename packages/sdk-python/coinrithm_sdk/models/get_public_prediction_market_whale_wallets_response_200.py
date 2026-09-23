from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.get_public_prediction_market_whale_wallets_response_200_window import (
    GetPublicPredictionMarketWhaleWalletsResponse200Window,
)
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.get_public_prediction_market_whale_wallets_response_200_wallets_item import (
        GetPublicPredictionMarketWhaleWalletsResponse200WalletsItem,
    )


T = TypeVar("T", bound="GetPublicPredictionMarketWhaleWalletsResponse200")


@_attrs_define
class GetPublicPredictionMarketWhaleWalletsResponse200:
    """
    Attributes:
        window (GetPublicPredictionMarketWhaleWalletsResponse200Window | Unset):
        venues (list[str] | Unset):
        wallets (list[GetPublicPredictionMarketWhaleWalletsResponse200WalletsItem] | Unset):
    """

    window: GetPublicPredictionMarketWhaleWalletsResponse200Window | Unset = UNSET
    venues: list[str] | Unset = UNSET
    wallets: list[GetPublicPredictionMarketWhaleWalletsResponse200WalletsItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        window: str | Unset = UNSET
        if not isinstance(self.window, Unset):
            window = self.window.value

        venues: list[str] | Unset = UNSET
        if not isinstance(self.venues, Unset):
            venues = self.venues

        wallets: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.wallets, Unset):
            wallets = []
            for wallets_item_data in self.wallets:
                wallets_item = wallets_item_data.to_dict()
                wallets.append(wallets_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if window is not UNSET:
            field_dict["window"] = window
        if venues is not UNSET:
            field_dict["venues"] = venues
        if wallets is not UNSET:
            field_dict["wallets"] = wallets

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_public_prediction_market_whale_wallets_response_200_wallets_item import (
            GetPublicPredictionMarketWhaleWalletsResponse200WalletsItem,
        )

        d = dict(src_dict)
        _window = d.pop("window", UNSET)
        window: GetPublicPredictionMarketWhaleWalletsResponse200Window | Unset
        if isinstance(_window, Unset):
            window = UNSET
        else:
            window = GetPublicPredictionMarketWhaleWalletsResponse200Window(_window)

        venues = cast(list[str], d.pop("venues", UNSET))

        _wallets = d.pop("wallets", UNSET)
        wallets: list[GetPublicPredictionMarketWhaleWalletsResponse200WalletsItem] | Unset = UNSET
        if _wallets is not UNSET:
            wallets = []
            for wallets_item_data in _wallets:
                wallets_item = GetPublicPredictionMarketWhaleWalletsResponse200WalletsItem.from_dict(wallets_item_data)

                wallets.append(wallets_item)

        get_public_prediction_market_whale_wallets_response_200 = cls(
            window=window,
            venues=venues,
            wallets=wallets,
        )

        get_public_prediction_market_whale_wallets_response_200.additional_properties = d
        return get_public_prediction_market_whale_wallets_response_200

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
