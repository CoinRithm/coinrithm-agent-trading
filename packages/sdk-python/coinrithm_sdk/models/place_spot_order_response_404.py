from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PlaceSpotOrderResponse404")


@_attrs_define
class PlaceSpotOrderResponse404:
    """
    Attributes:
        error (str | Unset):
        block_reasons (list[str] | Unset):
    """

    error: str | Unset = UNSET
    block_reasons: list[str] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        error = self.error

        block_reasons: list[str] | Unset = UNSET
        if not isinstance(self.block_reasons, Unset):
            block_reasons = self.block_reasons

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if error is not UNSET:
            field_dict["error"] = error
        if block_reasons is not UNSET:
            field_dict["blockReasons"] = block_reasons

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        error = d.pop("error", UNSET)

        block_reasons = cast(list[str], d.pop("blockReasons", UNSET))

        place_spot_order_response_404 = cls(
            error=error,
            block_reasons=block_reasons,
        )

        place_spot_order_response_404.additional_properties = d
        return place_spot_order_response_404

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
