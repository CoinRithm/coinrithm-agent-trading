from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicTradfiReferenceHistoryWindow")


@_attrs_define
class PublicTradfiReferenceHistoryWindow:
    """
    Attributes:
        window (str): `24h` or `7d`.
        from_ (datetime.datetime):
        to (datetime.datetime):
        interval_seconds (int):
    """

    window: str
    from_: datetime.datetime
    to: datetime.datetime
    interval_seconds: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        window = self.window

        from_ = self.from_.isoformat()

        to = self.to.isoformat()

        interval_seconds = self.interval_seconds

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "window": window,
                "from": from_,
                "to": to,
                "intervalSeconds": interval_seconds,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        window = d.pop("window")

        from_ = datetime.datetime.fromisoformat(d.pop("from").replace("Z", "+00:00"))

        to = datetime.datetime.fromisoformat(d.pop("to").replace("Z", "+00:00"))

        interval_seconds = d.pop("intervalSeconds")

        public_tradfi_reference_history_window = cls(
            window=window,
            from_=from_,
            to=to,
            interval_seconds=interval_seconds,
        )

        public_tradfi_reference_history_window.additional_properties = d
        return public_tradfi_reference_history_window

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
