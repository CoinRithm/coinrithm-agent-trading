from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicCftcChange")


@_attrs_define
class PublicCftcChange:
    """Week-over-week changes as computed by CFTC; null when not published.

    Attributes:
        open_interest (float | None):
        non_commercial_net (float | None):
        commercial_net (float | None):
    """

    open_interest: float | None
    non_commercial_net: float | None
    commercial_net: float | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        open_interest: float | None
        open_interest = self.open_interest

        non_commercial_net: float | None
        non_commercial_net = self.non_commercial_net

        commercial_net: float | None
        commercial_net = self.commercial_net

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "openInterest": open_interest,
                "nonCommercialNet": non_commercial_net,
                "commercialNet": commercial_net,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_open_interest(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        open_interest = _parse_open_interest(d.pop("openInterest"))

        def _parse_non_commercial_net(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        non_commercial_net = _parse_non_commercial_net(d.pop("nonCommercialNet"))

        def _parse_commercial_net(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        commercial_net = _parse_commercial_net(d.pop("commercialNet"))

        public_cftc_change = cls(
            open_interest=open_interest,
            non_commercial_net=non_commercial_net,
            commercial_net=commercial_net,
        )

        public_cftc_change.additional_properties = d
        return public_cftc_change

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
