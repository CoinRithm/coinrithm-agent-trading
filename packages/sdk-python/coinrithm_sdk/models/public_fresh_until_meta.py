from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicFreshUntilMeta")


@_attrs_define
class PublicFreshUntilMeta:
    """
    Attributes:
        fresh_until (datetime.datetime): Instant until which shared caches may reuse this response.
    """

    fresh_until: datetime.datetime
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        fresh_until = self.fresh_until.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "freshUntil": fresh_until,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        fresh_until = datetime.datetime.fromisoformat(d.pop("freshUntil").replace("Z", "+00:00"))

        public_fresh_until_meta = cls(
            fresh_until=fresh_until,
        )

        public_fresh_until_meta.additional_properties = d
        return public_fresh_until_meta

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
