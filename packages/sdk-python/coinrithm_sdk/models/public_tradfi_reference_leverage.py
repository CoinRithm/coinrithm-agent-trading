from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicTradfiReferenceLeverage")


@_attrs_define
class PublicTradfiReferenceLeverage:
    """
    Attributes:
        factor (float): Daily target multiple of the underlying's return; negative means inverse.
        underlying (str):
    """

    factor: float
    underlying: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        factor = self.factor

        underlying = self.underlying

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "factor": factor,
                "underlying": underlying,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        factor = d.pop("factor")

        underlying = d.pop("underlying")

        public_tradfi_reference_leverage = cls(
            factor=factor,
            underlying=underlying,
        )

        public_tradfi_reference_leverage.additional_properties = d
        return public_tradfi_reference_leverage

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
