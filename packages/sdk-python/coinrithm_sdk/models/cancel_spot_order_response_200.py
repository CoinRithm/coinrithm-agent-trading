from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="CancelSpotOrderResponse200")


@_attrs_define
class CancelSpotOrderResponse200:
    """
    Attributes:
        ok (bool | Unset):
        already_closed (bool | Unset): True when the order is not open under this key. Omitted after this request
            cancels an open order; does not identify why an order is absent.
    """

    ok: bool | Unset = UNSET
    already_closed: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        ok = self.ok

        already_closed = self.already_closed

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if ok is not UNSET:
            field_dict["ok"] = ok
        if already_closed is not UNSET:
            field_dict["alreadyClosed"] = already_closed

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        ok = d.pop("ok", UNSET)

        already_closed = d.pop("alreadyClosed", UNSET)

        cancel_spot_order_response_200 = cls(
            ok=ok,
            already_closed=already_closed,
        )

        cancel_spot_order_response_200.additional_properties = d
        return cancel_spot_order_response_200

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
