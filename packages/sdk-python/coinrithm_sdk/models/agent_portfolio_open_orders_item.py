from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="AgentPortfolioOpenOrdersItem")


@_attrs_define
class AgentPortfolioOpenOrdersItem:
    """
    Attributes:
        id (int | Unset):
        side (str | Unset):
        order_type (str | Unset):
        coin_id (str | Unset):
        symbol (str | Unset):
        price (float | str | Unset): "Market" string for market orders, else numeric limit price.
        quantity (float | Unset):
        quantity_filled (float | Unset):
        status (str | Unset):
        current_price_usd (float | Unset):
    """

    id: int | Unset = UNSET
    side: str | Unset = UNSET
    order_type: str | Unset = UNSET
    coin_id: str | Unset = UNSET
    symbol: str | Unset = UNSET
    price: float | str | Unset = UNSET
    quantity: float | Unset = UNSET
    quantity_filled: float | Unset = UNSET
    status: str | Unset = UNSET
    current_price_usd: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        side = self.side

        order_type = self.order_type

        coin_id = self.coin_id

        symbol = self.symbol

        price: float | str | Unset
        if isinstance(self.price, Unset):
            price = UNSET
        else:
            price = self.price

        quantity = self.quantity

        quantity_filled = self.quantity_filled

        status = self.status

        current_price_usd = self.current_price_usd

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
        if symbol is not UNSET:
            field_dict["symbol"] = symbol
        if price is not UNSET:
            field_dict["price"] = price
        if quantity is not UNSET:
            field_dict["quantity"] = quantity
        if quantity_filled is not UNSET:
            field_dict["quantityFilled"] = quantity_filled
        if status is not UNSET:
            field_dict["status"] = status
        if current_price_usd is not UNSET:
            field_dict["currentPriceUsd"] = current_price_usd

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id", UNSET)

        side = d.pop("side", UNSET)

        order_type = d.pop("orderType", UNSET)

        coin_id = d.pop("coinId", UNSET)

        symbol = d.pop("symbol", UNSET)

        def _parse_price(data: object) -> float | str | Unset:
            if isinstance(data, Unset):
                return data
            return cast(float | str | Unset, data)

        price = _parse_price(d.pop("price", UNSET))

        quantity = d.pop("quantity", UNSET)

        quantity_filled = d.pop("quantityFilled", UNSET)

        status = d.pop("status", UNSET)

        current_price_usd = d.pop("currentPriceUsd", UNSET)

        agent_portfolio_open_orders_item = cls(
            id=id,
            side=side,
            order_type=order_type,
            coin_id=coin_id,
            symbol=symbol,
            price=price,
            quantity=quantity,
            quantity_filled=quantity_filled,
            status=status,
            current_price_usd=current_price_usd,
        )

        agent_portfolio_open_orders_item.additional_properties = d
        return agent_portfolio_open_orders_item

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
