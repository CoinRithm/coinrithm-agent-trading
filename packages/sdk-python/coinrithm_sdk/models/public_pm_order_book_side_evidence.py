from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmOrderBookSideEvidence")


@_attrs_define
class PublicPmOrderBookSideEvidence:
    """True when that side's supplied levels validated completely and the
    book is not crossed (an explicit empty side is valid). A dated
    observation, not a fill or liquidity guarantee.

        Attributes:
            bid (bool | Unset):
            ask (bool | Unset):
    """

    bid: bool | Unset = UNSET
    ask: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        bid = self.bid

        ask = self.ask

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if bid is not UNSET:
            field_dict["bid"] = bid
        if ask is not UNSET:
            field_dict["ask"] = ask

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        bid = d.pop("bid", UNSET)

        ask = d.pop("ask", UNSET)

        public_pm_order_book_side_evidence = cls(
            bid=bid,
            ask=ask,
        )

        public_pm_order_book_side_evidence.additional_properties = d
        return public_pm_order_book_side_evidence

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
