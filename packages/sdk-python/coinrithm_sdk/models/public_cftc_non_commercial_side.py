from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicCftcNonCommercialSide")


@_attrs_define
class PublicCftcNonCommercialSide:
    """
    Attributes:
        long (float):
        short (float):
        net (float):
        spreading (float | None):
    """

    long: float
    short: float
    net: float
    spreading: float | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        long = self.long

        short = self.short

        net = self.net

        spreading: float | None
        spreading = self.spreading

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "long": long,
                "short": short,
                "net": net,
                "spreading": spreading,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        long = d.pop("long")

        short = d.pop("short")

        net = d.pop("net")

        def _parse_spreading(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        spreading = _parse_spreading(d.pop("spreading"))

        public_cftc_non_commercial_side = cls(
            long=long,
            short=short,
            net=net,
            spreading=spreading,
        )

        public_cftc_non_commercial_side.additional_properties = d
        return public_cftc_non_commercial_side

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
