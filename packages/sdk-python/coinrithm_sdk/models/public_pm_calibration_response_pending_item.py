from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_calibration_response_pending_item_excluded import (
        PublicPmCalibrationResponsePendingItemExcluded,
    )


T = TypeVar("T", bound="PublicPmCalibrationResponsePendingItem")


@_attrs_define
class PublicPmCalibrationResponsePendingItem:
    """
    Attributes:
        source (str | Unset):
        name (str | Unset):
        reason (str | Unset):
        excluded (PublicPmCalibrationResponsePendingItemExcluded | Unset): Same exclusion counts as on `scored` rows,
            when computed.
    """

    source: str | Unset = UNSET
    name: str | Unset = UNSET
    reason: str | Unset = UNSET
    excluded: PublicPmCalibrationResponsePendingItemExcluded | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        source = self.source

        name = self.name

        reason = self.reason

        excluded: dict[str, Any] | Unset = UNSET
        if not isinstance(self.excluded, Unset):
            excluded = self.excluded.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if source is not UNSET:
            field_dict["source"] = source
        if name is not UNSET:
            field_dict["name"] = name
        if reason is not UNSET:
            field_dict["reason"] = reason
        if excluded is not UNSET:
            field_dict["excluded"] = excluded

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_calibration_response_pending_item_excluded import (
            PublicPmCalibrationResponsePendingItemExcluded,
        )

        d = dict(src_dict)
        source = d.pop("source", UNSET)

        name = d.pop("name", UNSET)

        reason = d.pop("reason", UNSET)

        _excluded = d.pop("excluded", UNSET)
        excluded: PublicPmCalibrationResponsePendingItemExcluded | Unset
        if isinstance(_excluded, Unset):
            excluded = UNSET
        else:
            excluded = PublicPmCalibrationResponsePendingItemExcluded.from_dict(_excluded)

        public_pm_calibration_response_pending_item = cls(
            source=source,
            name=name,
            reason=reason,
            excluded=excluded,
        )

        public_pm_calibration_response_pending_item.additional_properties = d
        return public_pm_calibration_response_pending_item

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
