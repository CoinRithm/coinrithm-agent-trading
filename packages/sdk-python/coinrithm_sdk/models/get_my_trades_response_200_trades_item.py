from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.get_my_trades_response_200_trades_item_venue import GetMyTradesResponse200TradesItemVenue
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.get_my_trades_response_200_trades_item_detail import GetMyTradesResponse200TradesItemDetail


T = TypeVar("T", bound="GetMyTradesResponse200TradesItem")


@_attrs_define
class GetMyTradesResponse200TradesItem:
    """
    Attributes:
        venue (GetMyTradesResponse200TradesItemVenue | Unset):
        id (int | Unset):
        closed_at (datetime.datetime | None | Unset):
        side (str | Unset):
        realized_pnl_musd (float | None | Unset):
        coin_id (None | str | Unset):
        symbol (None | str | Unset):
        market (None | str | Unset):
        outcome (None | str | Unset):
        detail (GetMyTradesResponse200TradesItemDetail | Unset):
    """

    venue: GetMyTradesResponse200TradesItemVenue | Unset = UNSET
    id: int | Unset = UNSET
    closed_at: datetime.datetime | None | Unset = UNSET
    side: str | Unset = UNSET
    realized_pnl_musd: float | None | Unset = UNSET
    coin_id: None | str | Unset = UNSET
    symbol: None | str | Unset = UNSET
    market: None | str | Unset = UNSET
    outcome: None | str | Unset = UNSET
    detail: GetMyTradesResponse200TradesItemDetail | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        venue: str | Unset = UNSET
        if not isinstance(self.venue, Unset):
            venue = self.venue.value

        id = self.id

        closed_at: None | str | Unset
        if isinstance(self.closed_at, Unset):
            closed_at = UNSET
        elif isinstance(self.closed_at, datetime.datetime):
            closed_at = self.closed_at.isoformat()
        else:
            closed_at = self.closed_at

        side = self.side

        realized_pnl_musd: float | None | Unset
        if isinstance(self.realized_pnl_musd, Unset):
            realized_pnl_musd = UNSET
        else:
            realized_pnl_musd = self.realized_pnl_musd

        coin_id: None | str | Unset
        if isinstance(self.coin_id, Unset):
            coin_id = UNSET
        else:
            coin_id = self.coin_id

        symbol: None | str | Unset
        if isinstance(self.symbol, Unset):
            symbol = UNSET
        else:
            symbol = self.symbol

        market: None | str | Unset
        if isinstance(self.market, Unset):
            market = UNSET
        else:
            market = self.market

        outcome: None | str | Unset
        if isinstance(self.outcome, Unset):
            outcome = UNSET
        else:
            outcome = self.outcome

        detail: dict[str, Any] | Unset = UNSET
        if not isinstance(self.detail, Unset):
            detail = self.detail.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if venue is not UNSET:
            field_dict["venue"] = venue
        if id is not UNSET:
            field_dict["id"] = id
        if closed_at is not UNSET:
            field_dict["closedAt"] = closed_at
        if side is not UNSET:
            field_dict["side"] = side
        if realized_pnl_musd is not UNSET:
            field_dict["realizedPnlMusd"] = realized_pnl_musd
        if coin_id is not UNSET:
            field_dict["coinId"] = coin_id
        if symbol is not UNSET:
            field_dict["symbol"] = symbol
        if market is not UNSET:
            field_dict["market"] = market
        if outcome is not UNSET:
            field_dict["outcome"] = outcome
        if detail is not UNSET:
            field_dict["detail"] = detail

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_my_trades_response_200_trades_item_detail import GetMyTradesResponse200TradesItemDetail

        d = dict(src_dict)
        _venue = d.pop("venue", UNSET)
        venue: GetMyTradesResponse200TradesItemVenue | Unset
        if isinstance(_venue, Unset):
            venue = UNSET
        else:
            venue = GetMyTradesResponse200TradesItemVenue(_venue)

        id = d.pop("id", UNSET)

        def _parse_closed_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                closed_at_type_0 = datetime.datetime.fromisoformat(data)

                return closed_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        closed_at = _parse_closed_at(d.pop("closedAt", UNSET))

        side = d.pop("side", UNSET)

        def _parse_realized_pnl_musd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        realized_pnl_musd = _parse_realized_pnl_musd(d.pop("realizedPnlMusd", UNSET))

        def _parse_coin_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        coin_id = _parse_coin_id(d.pop("coinId", UNSET))

        def _parse_symbol(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        symbol = _parse_symbol(d.pop("symbol", UNSET))

        def _parse_market(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        market = _parse_market(d.pop("market", UNSET))

        def _parse_outcome(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        outcome = _parse_outcome(d.pop("outcome", UNSET))

        _detail = d.pop("detail", UNSET)
        detail: GetMyTradesResponse200TradesItemDetail | Unset
        if isinstance(_detail, Unset):
            detail = UNSET
        else:
            detail = GetMyTradesResponse200TradesItemDetail.from_dict(_detail)

        get_my_trades_response_200_trades_item = cls(
            venue=venue,
            id=id,
            closed_at=closed_at,
            side=side,
            realized_pnl_musd=realized_pnl_musd,
            coin_id=coin_id,
            symbol=symbol,
            market=market,
            outcome=outcome,
            detail=detail,
        )

        get_my_trades_response_200_trades_item.additional_properties = d
        return get_my_trades_response_200_trades_item

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
