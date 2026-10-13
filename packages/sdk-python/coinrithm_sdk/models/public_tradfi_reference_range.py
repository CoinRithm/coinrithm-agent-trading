from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicTradfiReferenceRange")


@_attrs_define
class PublicTradfiReferenceRange:
    """Low and high of validated recorded medians in the 24 hours ending at `latest`.

    Attributes:
        low (float):
        high (float):
        observations (int):
    """

    low: float
    high: float
    observations: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        low = self.low

        high = self.high

        observations = self.observations

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "low": low,
                "high": high,
                "observations": observations,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        low = d.pop("low")

        high = d.pop("high")

        observations = d.pop("observations")

        public_tradfi_reference_range = cls(
            low=low,
            high=high,
            observations=observations,
        )

        public_tradfi_reference_range.additional_properties = d
        return public_tradfi_reference_range

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
