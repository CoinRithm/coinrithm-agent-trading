from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicTradfiReferenceWeek52")


@_attrs_define
class PublicTradfiReferenceWeek52:
    """
    Attributes:
        high (float):
        low (float):
        as_of (datetime.date): Latest UTC day included.
        days (int): Days with data in the window (not 365 while history is short).
    """

    high: float
    low: float
    as_of: datetime.date
    days: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        high = self.high

        low = self.low

        as_of = self.as_of.isoformat()

        days = self.days

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "high": high,
                "low": low,
                "asOf": as_of,
                "days": days,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        high = d.pop("high")

        low = d.pop("low")

        as_of = datetime.date.fromisoformat(d.pop("asOf"))

        days = d.pop("days")

        public_tradfi_reference_week_52 = cls(
            high=high,
            low=low,
            as_of=as_of,
            days=days,
        )

        public_tradfi_reference_week_52.additional_properties = d
        return public_tradfi_reference_week_52

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
