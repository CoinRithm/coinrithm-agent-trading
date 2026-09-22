from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.audit_futures_position_side import AuditFuturesPositionSide
from ..models.audit_futures_position_status import AuditFuturesPositionStatus
from ..types import UNSET, Unset

T = TypeVar("T", bound="AuditFuturesPosition")


@_attrs_define
class AuditFuturesPosition:
    """
    Attributes:
        id (int | Unset):
        coin_symbol (str | Unset):
        side (AuditFuturesPositionSide | Unset):
        leverage (float | Unset):
        entry_price (float | Unset):
        margin_musd (float | Unset):
        notional_musd (float | Unset):
        size_coin (float | Unset):
        maintenance_margin_rate (float | Unset):
        liquidation_price (float | Unset):
        stop_loss_price (float | None | Unset):
        take_profit_price (float | None | Unset):
        entry_price_as_of (datetime.datetime | None | Unset):
        entry_freshness_age_seconds (float | None | Unset):
        entry_freshness_status (None | str | Unset):
        status (AuditFuturesPositionStatus | Unset):
        exit_price (float | None | Unset):
        exit_reason (None | str | Unset):
        realized_pnl_musd (float | None | Unset):
        fill_model (None | str | Unset):
        idempotency_key (None | str | Unset):
        opened_at (datetime.datetime | None | Unset):
        closed_at (datetime.datetime | None | Unset):
        created_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    coin_symbol: str | Unset = UNSET
    side: AuditFuturesPositionSide | Unset = UNSET
    leverage: float | Unset = UNSET
    entry_price: float | Unset = UNSET
    margin_musd: float | Unset = UNSET
    notional_musd: float | Unset = UNSET
    size_coin: float | Unset = UNSET
    maintenance_margin_rate: float | Unset = UNSET
    liquidation_price: float | Unset = UNSET
    stop_loss_price: float | None | Unset = UNSET
    take_profit_price: float | None | Unset = UNSET
    entry_price_as_of: datetime.datetime | None | Unset = UNSET
    entry_freshness_age_seconds: float | None | Unset = UNSET
    entry_freshness_status: None | str | Unset = UNSET
    status: AuditFuturesPositionStatus | Unset = UNSET
    exit_price: float | None | Unset = UNSET
    exit_reason: None | str | Unset = UNSET
    realized_pnl_musd: float | None | Unset = UNSET
    fill_model: None | str | Unset = UNSET
    idempotency_key: None | str | Unset = UNSET
    opened_at: datetime.datetime | None | Unset = UNSET
    closed_at: datetime.datetime | None | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        coin_symbol = self.coin_symbol

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

        entry_price_as_of: None | str | Unset
        if isinstance(self.entry_price_as_of, Unset):
            entry_price_as_of = UNSET
        elif isinstance(self.entry_price_as_of, datetime.datetime):
            entry_price_as_of = self.entry_price_as_of.isoformat()
        else:
            entry_price_as_of = self.entry_price_as_of

        entry_freshness_age_seconds: float | None | Unset
        if isinstance(self.entry_freshness_age_seconds, Unset):
            entry_freshness_age_seconds = UNSET
        else:
            entry_freshness_age_seconds = self.entry_freshness_age_seconds

        entry_freshness_status: None | str | Unset
        if isinstance(self.entry_freshness_status, Unset):
            entry_freshness_status = UNSET
        else:
            entry_freshness_status = self.entry_freshness_status

        status: str | Unset = UNSET
        if not isinstance(self.status, Unset):
            status = self.status.value

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

        fill_model: None | str | Unset
        if isinstance(self.fill_model, Unset):
            fill_model = UNSET
        else:
            fill_model = self.fill_model

        idempotency_key: None | str | Unset
        if isinstance(self.idempotency_key, Unset):
            idempotency_key = UNSET
        else:
            idempotency_key = self.idempotency_key

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

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if id is not UNSET:
            field_dict["id"] = id
        if coin_symbol is not UNSET:
            field_dict["coinSymbol"] = coin_symbol
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
        if stop_loss_price is not UNSET:
            field_dict["stopLossPrice"] = stop_loss_price
        if take_profit_price is not UNSET:
            field_dict["takeProfitPrice"] = take_profit_price
        if entry_price_as_of is not UNSET:
            field_dict["entryPriceAsOf"] = entry_price_as_of
        if entry_freshness_age_seconds is not UNSET:
            field_dict["entryFreshnessAgeSeconds"] = entry_freshness_age_seconds
        if entry_freshness_status is not UNSET:
            field_dict["entryFreshnessStatus"] = entry_freshness_status
        if status is not UNSET:
            field_dict["status"] = status
        if exit_price is not UNSET:
            field_dict["exitPrice"] = exit_price
        if exit_reason is not UNSET:
            field_dict["exitReason"] = exit_reason
        if realized_pnl_musd is not UNSET:
            field_dict["realizedPnlMusd"] = realized_pnl_musd
        if fill_model is not UNSET:
            field_dict["fillModel"] = fill_model
        if idempotency_key is not UNSET:
            field_dict["idempotencyKey"] = idempotency_key
        if opened_at is not UNSET:
            field_dict["openedAt"] = opened_at
        if closed_at is not UNSET:
            field_dict["closedAt"] = closed_at
        if created_at is not UNSET:
            field_dict["createdAt"] = created_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id", UNSET)

        coin_symbol = d.pop("coinSymbol", UNSET)

        _side = d.pop("side", UNSET)
        side: AuditFuturesPositionSide | Unset
        if isinstance(_side, Unset):
            side = UNSET
        else:
            side = AuditFuturesPositionSide(_side)

        leverage = d.pop("leverage", UNSET)

        entry_price = d.pop("entryPrice", UNSET)

        margin_musd = d.pop("marginMusd", UNSET)

        notional_musd = d.pop("notionalMusd", UNSET)

        size_coin = d.pop("sizeCoin", UNSET)

        maintenance_margin_rate = d.pop("maintenanceMarginRate", UNSET)

        liquidation_price = d.pop("liquidationPrice", UNSET)

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

        def _parse_entry_price_as_of(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                entry_price_as_of_type_0 = datetime.datetime.fromisoformat(data)

                return entry_price_as_of_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        entry_price_as_of = _parse_entry_price_as_of(d.pop("entryPriceAsOf", UNSET))

        def _parse_entry_freshness_age_seconds(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        entry_freshness_age_seconds = _parse_entry_freshness_age_seconds(d.pop("entryFreshnessAgeSeconds", UNSET))

        def _parse_entry_freshness_status(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        entry_freshness_status = _parse_entry_freshness_status(d.pop("entryFreshnessStatus", UNSET))

        _status = d.pop("status", UNSET)
        status: AuditFuturesPositionStatus | Unset
        if isinstance(_status, Unset):
            status = UNSET
        else:
            status = AuditFuturesPositionStatus(_status)

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

        def _parse_fill_model(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        fill_model = _parse_fill_model(d.pop("fillModel", UNSET))

        def _parse_idempotency_key(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        idempotency_key = _parse_idempotency_key(d.pop("idempotencyKey", UNSET))

        def _parse_opened_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                opened_at_type_0 = datetime.datetime.fromisoformat(data)

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
                closed_at_type_0 = datetime.datetime.fromisoformat(data)

                return closed_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        closed_at = _parse_closed_at(d.pop("closedAt", UNSET))

        _created_at = d.pop("createdAt", UNSET)
        created_at: datetime.datetime | Unset
        if isinstance(_created_at, Unset):
            created_at = UNSET
        else:
            created_at = datetime.datetime.fromisoformat(_created_at)

        audit_futures_position = cls(
            id=id,
            coin_symbol=coin_symbol,
            side=side,
            leverage=leverage,
            entry_price=entry_price,
            margin_musd=margin_musd,
            notional_musd=notional_musd,
            size_coin=size_coin,
            maintenance_margin_rate=maintenance_margin_rate,
            liquidation_price=liquidation_price,
            stop_loss_price=stop_loss_price,
            take_profit_price=take_profit_price,
            entry_price_as_of=entry_price_as_of,
            entry_freshness_age_seconds=entry_freshness_age_seconds,
            entry_freshness_status=entry_freshness_status,
            status=status,
            exit_price=exit_price,
            exit_reason=exit_reason,
            realized_pnl_musd=realized_pnl_musd,
            fill_model=fill_model,
            idempotency_key=idempotency_key,
            opened_at=opened_at,
            closed_at=closed_at,
            created_at=created_at,
        )

        audit_futures_position.additional_properties = d
        return audit_futures_position

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
