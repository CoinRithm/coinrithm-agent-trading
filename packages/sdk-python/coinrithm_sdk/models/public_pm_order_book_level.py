from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="PublicPmOrderBookLevel")


@_attrs_define
class PublicPmOrderBookLevel:
    """
    Attributes:
        price (float): Probability 0-1, a fraction.
        size (float): Resting size in shares (Polymarket) or contracts (Kalshi).
    """

    price: float
    size: float

    def to_dict(self) -> dict[str, Any]:
        price = self.price

        size = self.size

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "price": price,
                "size": size,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        price = d.pop("price")

        size = d.pop("size")

        public_pm_order_book_level = cls(
            price=price,
            size=size,
        )

        return public_pm_order_book_level
