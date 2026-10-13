from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicLiquidationsWindow")


@_attrs_define
class PublicLiquidationsWindow:
    """
    Attributes:
        from_ (datetime.datetime):
        to (datetime.datetime):
        hours (int):
    """

    from_: datetime.datetime
    to: datetime.datetime
    hours: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from_ = self.from_.isoformat()

        to = self.to.isoformat()

        hours = self.hours

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "from": from_,
                "to": to,
                "hours": hours,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        from_ = datetime.datetime.fromisoformat(d.pop("from").replace("Z", "+00:00"))

        to = datetime.datetime.fromisoformat(d.pop("to").replace("Z", "+00:00"))

        hours = d.pop("hours")

        public_liquidations_window = cls(
            from_=from_,
            to=to,
            hours=hours,
        )

        public_liquidations_window.additional_properties = d
        return public_liquidations_window

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
