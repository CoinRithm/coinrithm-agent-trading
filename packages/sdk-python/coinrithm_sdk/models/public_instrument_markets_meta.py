from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicInstrumentMarketsMeta")


@_attrs_define
class PublicInstrumentMarketsMeta:
    """
    Attributes:
        fresh_until (datetime.datetime | Unset):
    """

    fresh_until: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        fresh_until: str | Unset = UNSET
        if not isinstance(self.fresh_until, Unset):
            fresh_until = self.fresh_until.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if fresh_until is not UNSET:
            field_dict["freshUntil"] = fresh_until

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        _fresh_until = d.pop("freshUntil", UNSET)
        fresh_until: datetime.datetime | Unset
        if isinstance(_fresh_until, Unset):
            fresh_until = UNSET
        else:
            fresh_until = datetime.datetime.fromisoformat(_fresh_until.replace("Z", "+00:00"))

        public_instrument_markets_meta = cls(
            fresh_until=fresh_until,
        )

        public_instrument_markets_meta.additional_properties = d
        return public_instrument_markets_meta

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
