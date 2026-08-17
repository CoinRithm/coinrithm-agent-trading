from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="DecisionSupportFlags")


@_attrs_define
class DecisionSupportFlags:
    """
    Attributes:
        thin_market (bool | Unset):
        inactive_market (bool | Unset):
        high_ambiguity (bool | Unset):
        near_resolution (bool | Unset):
    """

    thin_market: bool | Unset = UNSET
    inactive_market: bool | Unset = UNSET
    high_ambiguity: bool | Unset = UNSET
    near_resolution: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        thin_market = self.thin_market

        inactive_market = self.inactive_market

        high_ambiguity = self.high_ambiguity

        near_resolution = self.near_resolution

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if thin_market is not UNSET:
            field_dict["thinMarket"] = thin_market
        if inactive_market is not UNSET:
            field_dict["inactiveMarket"] = inactive_market
        if high_ambiguity is not UNSET:
            field_dict["highAmbiguity"] = high_ambiguity
        if near_resolution is not UNSET:
            field_dict["nearResolution"] = near_resolution

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        thin_market = d.pop("thinMarket", UNSET)

        inactive_market = d.pop("inactiveMarket", UNSET)

        high_ambiguity = d.pop("highAmbiguity", UNSET)

        near_resolution = d.pop("nearResolution", UNSET)

        decision_support_flags = cls(
            thin_market=thin_market,
            inactive_market=inactive_market,
            high_ambiguity=high_ambiguity,
            near_resolution=near_resolution,
        )

        decision_support_flags.additional_properties = d
        return decision_support_flags

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
