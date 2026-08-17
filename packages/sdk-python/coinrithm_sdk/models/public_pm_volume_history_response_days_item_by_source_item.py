from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmVolumeHistoryResponseDaysItemBySourceItem")


@_attrs_define
class PublicPmVolumeHistoryResponseDaysItemBySourceItem:
    """
    Attributes:
        source (str | Unset):
        name (str | Unset):
        volume24h (float | None | Unset):
    """

    source: str | Unset = UNSET
    name: str | Unset = UNSET
    volume24h: float | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        source = self.source

        name = self.name

        volume24h: float | None | Unset
        if isinstance(self.volume24h, Unset):
            volume24h = UNSET
        else:
            volume24h = self.volume24h

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if source is not UNSET:
            field_dict["source"] = source
        if name is not UNSET:
            field_dict["name"] = name
        if volume24h is not UNSET:
            field_dict["volume24h"] = volume24h

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        source = d.pop("source", UNSET)

        name = d.pop("name", UNSET)

        def _parse_volume24h(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        volume24h = _parse_volume24h(d.pop("volume24h", UNSET))

        public_pm_volume_history_response_days_item_by_source_item = cls(
            source=source,
            name=name,
            volume24h=volume24h,
        )

        public_pm_volume_history_response_days_item_by_source_item.additional_properties = d
        return public_pm_volume_history_response_days_item_by_source_item

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
