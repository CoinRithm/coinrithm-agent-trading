from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.get_public_prediction_market_whale_wallets_response_200_wallets_item_venues_item import (
        GetPublicPredictionMarketWhaleWalletsResponse200WalletsItemVenuesItem,
    )


T = TypeVar("T", bound="GetPublicPredictionMarketWhaleWalletsResponse200WalletsItem")


@_attrs_define
class GetPublicPredictionMarketWhaleWalletsResponse200WalletsItem:
    """
    Attributes:
        wallet (str | Unset):
        address (str | Unset):
        trader_name (None | str | Unset):
        venues (list[GetPublicPredictionMarketWhaleWalletsResponse200WalletsItemVenuesItem] | Unset):
        trade_count (float | Unset):
        total_usd (float | Unset):
        max_usd (float | Unset):
        first_seen (datetime.datetime | None | Unset):
        last_seen (datetime.datetime | None | Unset):
    """

    wallet: str | Unset = UNSET
    address: str | Unset = UNSET
    trader_name: None | str | Unset = UNSET
    venues: list[GetPublicPredictionMarketWhaleWalletsResponse200WalletsItemVenuesItem] | Unset = UNSET
    trade_count: float | Unset = UNSET
    total_usd: float | Unset = UNSET
    max_usd: float | Unset = UNSET
    first_seen: datetime.datetime | None | Unset = UNSET
    last_seen: datetime.datetime | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        wallet = self.wallet

        address = self.address

        trader_name: None | str | Unset
        if isinstance(self.trader_name, Unset):
            trader_name = UNSET
        else:
            trader_name = self.trader_name

        venues: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.venues, Unset):
            venues = []
            for venues_item_data in self.venues:
                venues_item = venues_item_data.to_dict()
                venues.append(venues_item)

        trade_count = self.trade_count

        total_usd = self.total_usd

        max_usd = self.max_usd

        first_seen: None | str | Unset
        if isinstance(self.first_seen, Unset):
            first_seen = UNSET
        elif isinstance(self.first_seen, datetime.datetime):
            first_seen = self.first_seen.isoformat()
        else:
            first_seen = self.first_seen

        last_seen: None | str | Unset
        if isinstance(self.last_seen, Unset):
            last_seen = UNSET
        elif isinstance(self.last_seen, datetime.datetime):
            last_seen = self.last_seen.isoformat()
        else:
            last_seen = self.last_seen

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if wallet is not UNSET:
            field_dict["wallet"] = wallet
        if address is not UNSET:
            field_dict["address"] = address
        if trader_name is not UNSET:
            field_dict["traderName"] = trader_name
        if venues is not UNSET:
            field_dict["venues"] = venues
        if trade_count is not UNSET:
            field_dict["tradeCount"] = trade_count
        if total_usd is not UNSET:
            field_dict["totalUsd"] = total_usd
        if max_usd is not UNSET:
            field_dict["maxUsd"] = max_usd
        if first_seen is not UNSET:
            field_dict["firstSeen"] = first_seen
        if last_seen is not UNSET:
            field_dict["lastSeen"] = last_seen

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_public_prediction_market_whale_wallets_response_200_wallets_item_venues_item import (
            GetPublicPredictionMarketWhaleWalletsResponse200WalletsItemVenuesItem,
        )

        d = dict(src_dict)
        wallet = d.pop("wallet", UNSET)

        address = d.pop("address", UNSET)

        def _parse_trader_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        trader_name = _parse_trader_name(d.pop("traderName", UNSET))

        _venues = d.pop("venues", UNSET)
        venues: list[GetPublicPredictionMarketWhaleWalletsResponse200WalletsItemVenuesItem] | Unset = UNSET
        if _venues is not UNSET:
            venues = []
            for venues_item_data in _venues:
                venues_item = GetPublicPredictionMarketWhaleWalletsResponse200WalletsItemVenuesItem.from_dict(
                    venues_item_data
                )

                venues.append(venues_item)

        trade_count = d.pop("tradeCount", UNSET)

        total_usd = d.pop("totalUsd", UNSET)

        max_usd = d.pop("maxUsd", UNSET)

        def _parse_first_seen(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                first_seen_type_0 = datetime.datetime.fromisoformat(data)

                return first_seen_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        first_seen = _parse_first_seen(d.pop("firstSeen", UNSET))

        def _parse_last_seen(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                last_seen_type_0 = datetime.datetime.fromisoformat(data)

                return last_seen_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        last_seen = _parse_last_seen(d.pop("lastSeen", UNSET))

        get_public_prediction_market_whale_wallets_response_200_wallets_item = cls(
            wallet=wallet,
            address=address,
            trader_name=trader_name,
            venues=venues,
            trade_count=trade_count,
            total_usd=total_usd,
            max_usd=max_usd,
            first_seen=first_seen,
            last_seen=last_seen,
        )

        get_public_prediction_market_whale_wallets_response_200_wallets_item.additional_properties = d
        return get_public_prediction_market_whale_wallets_response_200_wallets_item

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
