from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.open_order_order_type import OpenOrderOrderType
from ..models.open_order_side import OpenOrderSide
from ..types import UNSET, Unset

T = TypeVar("T", bound="OpenOrder")


@_attrs_define
class OpenOrder:
    """
    Attributes:
        id (int | Unset):
        side (OpenOrderSide | Unset):
        order_type (OpenOrderOrderType | Unset):
        coin_id (str | Unset):
        limit_price (float | None | Unset):
        stop_price (float | None | Unset):
        quantity (float | Unset):
        quantity_filled (float | None | Unset):
        triggered (bool | None | Unset):
        created_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    side: OpenOrderSide | Unset = UNSET
    order_type: OpenOrderOrderType | Unset = UNSET
    coin_id: str | Unset = UNSET
    limit_price: float | None | Unset = UNSET
    stop_price: float | None | Unset = UNSET
    quantity: float | Unset = UNSET
    quantity_filled: float | None | Unset = UNSET
    triggered: bool | None | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        side: str | Unset = UNSET
        if not isinstance(self.side, Unset):
            side = self.side.value

        order_type: str | Unset = UNSET
        if not isinstance(self.order_type, Unset):
            order_type = self.order_type.value

        coin_id = self.coin_id

        limit_price: float | None | Unset
        if isinstance(self.limit_price, Unset):
            limit_price = UNSET
        else:
            limit_price = self.limit_price

        stop_price: float | None | Unset
        if isinstance(self.stop_price, Unset):
            stop_price = UNSET
        else:
            stop_price = self.stop_price

        quantity = self.quantity

        quantity_filled: float | None | Unset
        if isinstance(self.quantity_filled, Unset):
            quantity_filled = UNSET
        else:
            quantity_filled = self.quantity_filled

        triggered: bool | None | Unset
        if isinstance(self.triggered, Unset):
            triggered = UNSET
        else:
            triggered = self.triggered

        created_at: str | Unset = UNSET
        if not isinstance(self.created_at, Unset):
            created_at = self.created_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if id is not UNSET:
            field_dict["id"] = id
        if side is not UNSET:
            field_dict["side"] = side
        if order_type is not UNSET:
            field_dict["orderType"] = order_type
        if coin_id is not UNSET:
            field_dict["coinId"] = coin_id
        if limit_price is not UNSET:
            field_dict["limitPrice"] = limit_price
        if stop_price is not UNSET:
            field_dict["stopPrice"] = stop_price
        if quantity is not UNSET:
            field_dict["quantity"] = quantity
        if quantity_filled is not UNSET:
            field_dict["quantityFilled"] = quantity_filled
        if triggered is not UNSET:
            field_dict["triggered"] = triggered
        if created_at is not UNSET:
            field_dict["createdAt"] = created_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id", UNSET)

        _side = d.pop("side", UNSET)
        side: OpenOrderSide | Unset
        if isinstance(_side, Unset):
            side = UNSET
        else:
            side = OpenOrderSide(_side)

        _order_type = d.pop("orderType", UNSET)
        order_type: OpenOrderOrderType | Unset
        if isinstance(_order_type, Unset):
            order_type = UNSET
        else:
            order_type = OpenOrderOrderType(_order_type)

        coin_id = d.pop("coinId", UNSET)

        def _parse_limit_price(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        limit_price = _parse_limit_price(d.pop("limitPrice", UNSET))

        def _parse_stop_price(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        stop_price = _parse_stop_price(d.pop("stopPrice", UNSET))

        quantity = d.pop("quantity", UNSET)

        def _parse_quantity_filled(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        quantity_filled = _parse_quantity_filled(d.pop("quantityFilled", UNSET))

        def _parse_triggered(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        triggered = _parse_triggered(d.pop("triggered", UNSET))

        _created_at = d.pop("createdAt", UNSET)
        created_at: datetime.datetime | Unset
        if isinstance(_created_at, Unset):
            created_at = UNSET
        else:
            created_at = datetime.datetime.fromisoformat(_created_at)

        open_order = cls(
            id=id,
            side=side,
            order_type=order_type,
            coin_id=coin_id,
            limit_price=limit_price,
            stop_price=stop_price,
            quantity=quantity,
            quantity_filled=quantity_filled,
            triggered=triggered,
            created_at=created_at,
        )

        open_order.additional_properties = d
        return open_order

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
