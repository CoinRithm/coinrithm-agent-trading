from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicPmSurpriseEntrySurprise")


@_attrs_define
class PublicPmSurpriseEntrySurprise:
    """
    Attributes:
        t_24_h_probability (float): Winning outcome's probability (0-100) roughly 24h before resolution.
        t_7_d_probability (float | None): Winning outcome's probability (0-100) roughly 7 days before resolution;
            frequently null.
    """

    t_24_h_probability: float
    t_7_d_probability: float | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        t_24_h_probability = self.t_24_h_probability

        t_7_d_probability: float | None
        t_7_d_probability = self.t_7_d_probability

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "t24hProbability": t_24_h_probability,
                "t7dProbability": t_7_d_probability,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        t_24_h_probability = d.pop("t24hProbability")

        def _parse_t_7_d_probability(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        t_7_d_probability = _parse_t_7_d_probability(d.pop("t7dProbability"))

        public_pm_surprise_entry_surprise = cls(
            t_24_h_probability=t_24_h_probability,
            t_7_d_probability=t_7_d_probability,
        )

        public_pm_surprise_entry_surprise.additional_properties = d
        return public_pm_surprise_entry_surprise

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
