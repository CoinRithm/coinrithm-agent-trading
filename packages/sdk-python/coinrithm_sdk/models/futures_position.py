from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.futures_position_side import FuturesPositionSide
from ..models.futures_position_status import FuturesPositionStatus
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime

if TYPE_CHECKING:
  from ..models.freshness import Freshness
  from ..models.futures_position_coin import FuturesPositionCoin





T = TypeVar("T", bound="FuturesPosition")



@_attrs_define
class FuturesPosition:
    """ Mock futures position. Live-mark fields (markPrice, unrealizedPnlMusd,
    liquidationDistancePct, atLiquidation) are added only on OPEN positions in
    the list endpoint; they may be null when no live mark is available.

        Attributes:
            id (int | Unset):
            status (FuturesPositionStatus | Unset):
            coin (FuturesPositionCoin | Unset):
            side (FuturesPositionSide | Unset):
            leverage (float | Unset):
            entry_price (float | Unset):
            margin_musd (float | Unset):
            notional_musd (float | Unset):
            size_coin (float | Unset):
            maintenance_margin_rate (float | Unset):
            liquidation_price (float | Unset):
            freshness_at_entry (Freshness | Unset): Data-freshness descriptor. Futures + spot use ageSeconds; PM uses
                ageMinutes. `status` is a freshness label; `basis` (PM only) names which
                timestamp the age was measured against.
            stop_loss_price (float | None | Unset): Resting stop-loss trigger (null = none).
            take_profit_price (float | None | Unset): Resting take-profit trigger (null = none).
            exit_price (float | None | Unset):
            exit_reason (None | str | Unset): user_close | liquidation | stop_loss | take_profit
            realized_pnl_musd (float | None | Unset):
            opened_at (datetime.datetime | None | Unset):
            closed_at (datetime.datetime | None | Unset):
            created_at (datetime.datetime | Unset):
            mark_price (float | None | Unset): list endpoint, open positions only
            unrealized_pnl_musd (float | None | Unset):
            liquidation_distance_pct (float | None | Unset):
            at_liquidation (bool | None | Unset):
     """

    id: int | Unset = UNSET
    status: FuturesPositionStatus | Unset = UNSET
    coin: FuturesPositionCoin | Unset = UNSET
    side: FuturesPositionSide | Unset = UNSET
    leverage: float | Unset = UNSET
    entry_price: float | Unset = UNSET
    margin_musd: float | Unset = UNSET
    notional_musd: float | Unset = UNSET
    size_coin: float | Unset = UNSET
    maintenance_margin_rate: float | Unset = UNSET
    liquidation_price: float | Unset = UNSET
    freshness_at_entry: Freshness | Unset = UNSET
    stop_loss_price: float | None | Unset = UNSET
    take_profit_price: float | None | Unset = UNSET
    exit_price: float | None | Unset = UNSET
    exit_reason: None | str | Unset = UNSET
    realized_pnl_musd: float | None | Unset = UNSET
    opened_at: datetime.datetime | None | Unset = UNSET
    closed_at: datetime.datetime | None | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    mark_price: float | None | Unset = UNSET
    unrealized_pnl_musd: float | None | Unset = UNSET
    liquidation_distance_pct: float | None | Unset = UNSET
    at_liquidation: bool | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.freshness import Freshness
        from ..models.futures_position_coin import FuturesPositionCoin
        id = self.id

        status: str | Unset = UNSET
        if not isinstance(self.status, Unset):
            status = self.status.value


        coin: dict[str, Any] | Unset = UNSET
        if not isinstance(self.coin, Unset):
            coin = self.coin.to_dict()

        side: str | Unset = UNSET
        if not isinstance(self.side, Unset):
            side = self.side.value


        leverage = self.leverage

        entry_price = self.entry_price

        margin_musd = self.margin_musd

        notional_musd = self.notional_musd

        size_coin = self.size_coin

        maintenance_margin_rate = self.maintenance_margin_rate

        liquidation_price = self.liquidation_price

        freshness_at_entry: dict[str, Any] | Unset = UNSET
        if not isinstance(self.freshness_at_entry, Unset):
            freshness_at_entry = self.freshness_at_entry.to_dict()

        stop_loss_price: float | None | Unset
        if isinstance(self.stop_loss_price, Unset):
            stop_loss_price = UNSET
        else:
            stop_loss_price = self.stop_loss_price

        take_profit_price: float | None | Unset
        if isinstance(self.take_profit_price, Unset):
            take_profit_price = UNSET
        else:
            take_profit_price = self.take_profit_price

        exit_price: float | None | Unset
        if isinstance(self.exit_price, Unset):
            exit_price = UNSET
        else:
            exit_price = self.exit_price

        exit_reason: None | str | Unset
        if isinstance(self.exit_reason, Unset):
            exit_reason = UNSET
        else:
            exit_reason = self.exit_reason

        realized_pnl_musd: float | None | Unset
        if isinstance(self.realized_pnl_musd, Unset):
            realized_pnl_musd = UNSET
        else:
            realized_pnl_musd = self.realized_pnl_musd

        opened_at: None | str | Unset
        if isinstance(self.opened_at, Unset):
            opened_at = UNSET
        elif isinstance(self.opened_at, datetime.datetime):
            opened_at = self.opened_at.isoformat()
        else:
            opened_at = self.opened_at

        closed_at: None | str | Unset
        if isinstance(self.closed_at, Unset):
            closed_at = UNSET
        elif isinstance(self.closed_at, datetime.datetime):
            closed_at = self.closed_at.isoformat()
        else:
            closed_at = self.closed_at

        created_at: str | Unset = UNSET
        if not isinstance(self.created_at, Unset):
            created_at = self.created_at.isoformat()

        mark_price: float | None | Unset
        if isinstance(self.mark_price, Unset):
            mark_price = UNSET
        else:
            mark_price = self.mark_price

        unrealized_pnl_musd: float | None | Unset
        if isinstance(self.unrealized_pnl_musd, Unset):
            unrealized_pnl_musd = UNSET
        else:
            unrealized_pnl_musd = self.unrealized_pnl_musd

        liquidation_distance_pct: float | None | Unset
        if isinstance(self.liquidation_distance_pct, Unset):
            liquidation_distance_pct = UNSET
        else:
            liquidation_distance_pct = self.liquidation_distance_pct

        at_liquidation: bool | None | Unset
        if isinstance(self.at_liquidation, Unset):
            at_liquidation = UNSET
        else:
            at_liquidation = self.at_liquidation


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if id is not UNSET:
            field_dict["id"] = id
        if status is not UNSET:
            field_dict["status"] = status
        if coin is not UNSET:
            field_dict["coin"] = coin
        if side is not UNSET:
            field_dict["side"] = side
        if leverage is not UNSET:
            field_dict["leverage"] = leverage
        if entry_price is not UNSET:
            field_dict["entryPrice"] = entry_price
        if margin_musd is not UNSET:
            field_dict["marginMusd"] = margin_musd
        if notional_musd is not UNSET:
            field_dict["notionalMusd"] = notional_musd
        if size_coin is not UNSET:
            field_dict["sizeCoin"] = size_coin
        if maintenance_margin_rate is not UNSET:
            field_dict["maintenanceMarginRate"] = maintenance_margin_rate
        if liquidation_price is not UNSET:
            field_dict["liquidationPrice"] = liquidation_price
        if freshness_at_entry is not UNSET:
            field_dict["freshnessAtEntry"] = freshness_at_entry
        if stop_loss_price is not UNSET:
            field_dict["stopLossPrice"] = stop_loss_price
        if take_profit_price is not UNSET:
            field_dict["takeProfitPrice"] = take_profit_price
        if exit_price is not UNSET:
            field_dict["exitPrice"] = exit_price
        if exit_reason is not UNSET:
            field_dict["exitReason"] = exit_reason
        if realized_pnl_musd is not UNSET:
            field_dict["realizedPnlMusd"] = realized_pnl_musd
        if opened_at is not UNSET:
            field_dict["openedAt"] = opened_at
        if closed_at is not UNSET:
            field_dict["closedAt"] = closed_at
        if created_at is not UNSET:
            field_dict["createdAt"] = created_at
        if mark_price is not UNSET:
            field_dict["markPrice"] = mark_price
        if unrealized_pnl_musd is not UNSET:
            field_dict["unrealizedPnlMusd"] = unrealized_pnl_musd
        if liquidation_distance_pct is not UNSET:
            field_dict["liquidationDistancePct"] = liquidation_distance_pct
        if at_liquidation is not UNSET:
            field_dict["atLiquidation"] = at_liquidation

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.freshness import Freshness
        from ..models.futures_position_coin import FuturesPositionCoin
        d = dict(src_dict)
        id = d.pop("id", UNSET)

        _status = d.pop("status", UNSET)
        status: FuturesPositionStatus | Unset
        if isinstance(_status,  Unset):
            status = UNSET
        else:
            status = FuturesPositionStatus(_status)




        _coin = d.pop("coin", UNSET)
        coin: FuturesPositionCoin | Unset
        if isinstance(_coin,  Unset):
            coin = UNSET
        else:
            coin = FuturesPositionCoin.from_dict(_coin)




        _side = d.pop("side", UNSET)
        side: FuturesPositionSide | Unset
        if isinstance(_side,  Unset):
            side = UNSET
        else:
            side = FuturesPositionSide(_side)




        leverage = d.pop("leverage", UNSET)

        entry_price = d.pop("entryPrice", UNSET)

        margin_musd = d.pop("marginMusd", UNSET)

        notional_musd = d.pop("notionalMusd", UNSET)

        size_coin = d.pop("sizeCoin", UNSET)

        maintenance_margin_rate = d.pop("maintenanceMarginRate", UNSET)

        liquidation_price = d.pop("liquidationPrice", UNSET)

        _freshness_at_entry = d.pop("freshnessAtEntry", UNSET)
        freshness_at_entry: Freshness | Unset
        if isinstance(_freshness_at_entry,  Unset):
            freshness_at_entry = UNSET
        else:
            freshness_at_entry = Freshness.from_dict(_freshness_at_entry)




        def _parse_stop_loss_price(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        stop_loss_price = _parse_stop_loss_price(d.pop("stopLossPrice", UNSET))


        def _parse_take_profit_price(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        take_profit_price = _parse_take_profit_price(d.pop("takeProfitPrice", UNSET))


        def _parse_exit_price(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        exit_price = _parse_exit_price(d.pop("exitPrice", UNSET))


        def _parse_exit_reason(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        exit_reason = _parse_exit_reason(d.pop("exitReason", UNSET))


        def _parse_realized_pnl_musd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        realized_pnl_musd = _parse_realized_pnl_musd(d.pop("realizedPnlMusd", UNSET))


        def _parse_opened_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                opened_at_type_0 = isoparse(data)



                return opened_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        opened_at = _parse_opened_at(d.pop("openedAt", UNSET))


        def _parse_closed_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                closed_at_type_0 = isoparse(data)



                return closed_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        closed_at = _parse_closed_at(d.pop("closedAt", UNSET))


        _created_at = d.pop("createdAt", UNSET)
        created_at: datetime.datetime | Unset
        if isinstance(_created_at,  Unset):
            created_at = UNSET
        else:
            created_at = isoparse(_created_at)




        def _parse_mark_price(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        mark_price = _parse_mark_price(d.pop("markPrice", UNSET))


        def _parse_unrealized_pnl_musd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        unrealized_pnl_musd = _parse_unrealized_pnl_musd(d.pop("unrealizedPnlMusd", UNSET))


        def _parse_liquidation_distance_pct(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        liquidation_distance_pct = _parse_liquidation_distance_pct(d.pop("liquidationDistancePct", UNSET))


        def _parse_at_liquidation(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        at_liquidation = _parse_at_liquidation(d.pop("atLiquidation", UNSET))


        futures_position = cls(
            id=id,
            status=status,
            coin=coin,
            side=side,
            leverage=leverage,
            entry_price=entry_price,
            margin_musd=margin_musd,
            notional_musd=notional_musd,
            size_coin=size_coin,
            maintenance_margin_rate=maintenance_margin_rate,
            liquidation_price=liquidation_price,
            freshness_at_entry=freshness_at_entry,
            stop_loss_price=stop_loss_price,
            take_profit_price=take_profit_price,
            exit_price=exit_price,
            exit_reason=exit_reason,
            realized_pnl_musd=realized_pnl_musd,
            opened_at=opened_at,
            closed_at=closed_at,
            created_at=created_at,
            mark_price=mark_price,
            unrealized_pnl_musd=unrealized_pnl_musd,
            liquidation_distance_pct=liquidation_distance_pct,
            at_liquidation=at_liquidation,
        )


        futures_position.additional_properties = d
        return futures_position

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
