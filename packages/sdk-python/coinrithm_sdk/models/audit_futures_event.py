from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="AuditFuturesEvent")


@_attrs_define
class AuditFuturesEvent:
    """
    Attributes:
        id (int | Unset):
        position_id (int | Unset):
        type_ (str | Unset):
        size_delta_coin (float | Unset):
        mark_price (float | Unset):
        fill_price (float | None | Unset): Executed fill price; markPrice remains the reference mark and slippage is
            already embedded here.
        realized_pnl_musd (float | Unset):
        margin_delta_musd (float | Unset):
        fee_musd (float | Unset):
        slippage_musd (float | Unset):
        execution_version (None | str | Unset):
        idempotency_key (None | str | Unset):
        created_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    position_id: int | Unset = UNSET
    type_: str | Unset = UNSET
    size_delta_coin: float | Unset = UNSET
    mark_price: float | Unset = UNSET
    fill_price: float | None | Unset = UNSET
    realized_pnl_musd: float | Unset = UNSET
    margin_delta_musd: float | Unset = UNSET
    fee_musd: float | Unset = UNSET
    slippage_musd: float | Unset = UNSET
    execution_version: None | str | Unset = UNSET
    idempotency_key: None | str | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        position_id = self.position_id

        type_ = self.type_

        size_delta_coin = self.size_delta_coin

        mark_price = self.mark_price

        fill_price: float | None | Unset
        if isinstance(self.fill_price, Unset):
            fill_price = UNSET
        else:
            fill_price = self.fill_price

        realized_pnl_musd = self.realized_pnl_musd

        margin_delta_musd = self.margin_delta_musd

        fee_musd = self.fee_musd

        slippage_musd = self.slippage_musd

        execution_version: None | str | Unset
        if isinstance(self.execution_version, Unset):
            execution_version = UNSET
        else:
            execution_version = self.execution_version

        idempotency_key: None | str | Unset
        if isinstance(self.idempotency_key, Unset):
            idempotency_key = UNSET
        else:
            idempotency_key = self.idempotency_key

        created_at: str | Unset = UNSET
        if not isinstance(self.created_at, Unset):
            created_at = self.created_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if id is not UNSET:
            field_dict["id"] = id
        if position_id is not UNSET:
            field_dict["positionId"] = position_id
        if type_ is not UNSET:
            field_dict["type"] = type_
        if size_delta_coin is not UNSET:
            field_dict["sizeDeltaCoin"] = size_delta_coin
        if mark_price is not UNSET:
            field_dict["markPrice"] = mark_price
        if fill_price is not UNSET:
            field_dict["fillPrice"] = fill_price
        if realized_pnl_musd is not UNSET:
            field_dict["realizedPnlMusd"] = realized_pnl_musd
        if margin_delta_musd is not UNSET:
            field_dict["marginDeltaMusd"] = margin_delta_musd
        if fee_musd is not UNSET:
            field_dict["feeMusd"] = fee_musd
        if slippage_musd is not UNSET:
            field_dict["slippageMusd"] = slippage_musd
        if execution_version is not UNSET:
            field_dict["executionVersion"] = execution_version
        if idempotency_key is not UNSET:
            field_dict["idempotencyKey"] = idempotency_key
        if created_at is not UNSET:
            field_dict["createdAt"] = created_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id", UNSET)

        position_id = d.pop("positionId", UNSET)

        type_ = d.pop("type", UNSET)

        size_delta_coin = d.pop("sizeDeltaCoin", UNSET)

        mark_price = d.pop("markPrice", UNSET)

        def _parse_fill_price(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        fill_price = _parse_fill_price(d.pop("fillPrice", UNSET))

        realized_pnl_musd = d.pop("realizedPnlMusd", UNSET)

        margin_delta_musd = d.pop("marginDeltaMusd", UNSET)

        fee_musd = d.pop("feeMusd", UNSET)

        slippage_musd = d.pop("slippageMusd", UNSET)

        def _parse_execution_version(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        execution_version = _parse_execution_version(d.pop("executionVersion", UNSET))

        def _parse_idempotency_key(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        idempotency_key = _parse_idempotency_key(d.pop("idempotencyKey", UNSET))

        _created_at = d.pop("createdAt", UNSET)
        created_at: datetime.datetime | Unset
        if isinstance(_created_at, Unset):
            created_at = UNSET
        else:
            created_at = datetime.datetime.fromisoformat(_created_at)

        audit_futures_event = cls(
            id=id,
            position_id=position_id,
            type_=type_,
            size_delta_coin=size_delta_coin,
            mark_price=mark_price,
            fill_price=fill_price,
            realized_pnl_musd=realized_pnl_musd,
            margin_delta_musd=margin_delta_musd,
            fee_musd=fee_musd,
            slippage_musd=slippage_musd,
            execution_version=execution_version,
            idempotency_key=idempotency_key,
            created_at=created_at,
        )

        audit_futures_event.additional_properties = d
        return audit_futures_event

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
