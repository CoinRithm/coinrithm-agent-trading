from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_volume_history_response_days_item_by_source_item import (
        PublicPmVolumeHistoryResponseDaysItemBySourceItem,
    )


T = TypeVar("T", bound="PublicPmVolumeHistoryResponseDaysItem")


@_attrs_define
class PublicPmVolumeHistoryResponseDaysItem:
    """
    Attributes:
        day (str | Unset):
        volume24h (float | None | Unset):
        by_source (list[PublicPmVolumeHistoryResponseDaysItemBySourceItem] | Unset):
    """

    day: str | Unset = UNSET
    volume24h: float | None | Unset = UNSET
    by_source: list[PublicPmVolumeHistoryResponseDaysItemBySourceItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        day = self.day

        volume24h: float | None | Unset
        if isinstance(self.volume24h, Unset):
            volume24h = UNSET
        else:
            volume24h = self.volume24h

        by_source: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.by_source, Unset):
            by_source = []
            for by_source_item_data in self.by_source:
                by_source_item = by_source_item_data.to_dict()
                by_source.append(by_source_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if day is not UNSET:
            field_dict["day"] = day
        if volume24h is not UNSET:
            field_dict["volume24h"] = volume24h
        if by_source is not UNSET:
            field_dict["bySource"] = by_source

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_volume_history_response_days_item_by_source_item import (
            PublicPmVolumeHistoryResponseDaysItemBySourceItem,
        )

        d = dict(src_dict)
        day = d.pop("day", UNSET)

        def _parse_volume24h(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        volume24h = _parse_volume24h(d.pop("volume24h", UNSET))

        _by_source = d.pop("bySource", UNSET)
        by_source: list[PublicPmVolumeHistoryResponseDaysItemBySourceItem] | Unset = UNSET
        if _by_source is not UNSET:
            by_source = []
            for by_source_item_data in _by_source:
                by_source_item = PublicPmVolumeHistoryResponseDaysItemBySourceItem.from_dict(by_source_item_data)

                by_source.append(by_source_item)

        public_pm_volume_history_response_days_item = cls(
            day=day,
            volume24h=volume24h,
            by_source=by_source,
        )

        public_pm_volume_history_response_days_item.additional_properties = d
        return public_pm_volume_history_response_days_item

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
