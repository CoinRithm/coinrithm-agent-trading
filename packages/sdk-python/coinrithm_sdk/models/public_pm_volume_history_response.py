from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_volume_history_response_days_item import PublicPmVolumeHistoryResponseDaysItem
    from ..models.public_pm_volume_history_response_meta import PublicPmVolumeHistoryResponseMeta


T = TypeVar("T", bound="PublicPmVolumeHistoryResponse")


@_attrs_define
class PublicPmVolumeHistoryResponse:
    """
    Attributes:
        days (list[PublicPmVolumeHistoryResponseDaysItem]):
        updated_at (datetime.datetime):
        meta (PublicPmVolumeHistoryResponseMeta | Unset):
    """

    days: list[PublicPmVolumeHistoryResponseDaysItem]
    updated_at: datetime.datetime
    meta: PublicPmVolumeHistoryResponseMeta | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        days = []
        for days_item_data in self.days:
            days_item = days_item_data.to_dict()
            days.append(days_item)

        updated_at = self.updated_at.isoformat()

        meta: dict[str, Any] | Unset = UNSET
        if not isinstance(self.meta, Unset):
            meta = self.meta.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "days": days,
                "updatedAt": updated_at,
            }
        )
        if meta is not UNSET:
            field_dict["meta"] = meta

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_volume_history_response_days_item import PublicPmVolumeHistoryResponseDaysItem
        from ..models.public_pm_volume_history_response_meta import PublicPmVolumeHistoryResponseMeta

        d = dict(src_dict)
        days = []
        _days = d.pop("days")
        for days_item_data in _days:
            days_item = PublicPmVolumeHistoryResponseDaysItem.from_dict(days_item_data)

            days.append(days_item)

        updated_at = datetime.datetime.fromisoformat(d.pop("updatedAt"))

        _meta = d.pop("meta", UNSET)
        meta: PublicPmVolumeHistoryResponseMeta | Unset
        if isinstance(_meta, Unset):
            meta = UNSET
        else:
            meta = PublicPmVolumeHistoryResponseMeta.from_dict(_meta)

        public_pm_volume_history_response = cls(
            days=days,
            updated_at=updated_at,
            meta=meta,
        )

        return public_pm_volume_history_response
