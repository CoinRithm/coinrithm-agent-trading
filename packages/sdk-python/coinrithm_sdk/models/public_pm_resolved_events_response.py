from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.public_pm_pagination import PublicPmPagination
    from ..models.public_pm_resolved_entry import PublicPmResolvedEntry
    from ..models.public_pm_resolved_events_response_meta import PublicPmResolvedEventsResponseMeta


T = TypeVar("T", bound="PublicPmResolvedEventsResponse")


@_attrs_define
class PublicPmResolvedEventsResponse:
    """
    Attributes:
        data (list[PublicPmResolvedEntry]):
        pagination (PublicPmPagination):
        meta (PublicPmResolvedEventsResponseMeta):
    """

    data: list[PublicPmResolvedEntry]
    pagination: PublicPmPagination
    meta: PublicPmResolvedEventsResponseMeta

    def to_dict(self) -> dict[str, Any]:
        data = []
        for data_item_data in self.data:
            data_item = data_item_data.to_dict()
            data.append(data_item)

        pagination = self.pagination.to_dict()

        meta = self.meta.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "data": data,
                "pagination": pagination,
                "meta": meta,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_pagination import PublicPmPagination
        from ..models.public_pm_resolved_entry import PublicPmResolvedEntry
        from ..models.public_pm_resolved_events_response_meta import PublicPmResolvedEventsResponseMeta

        d = dict(src_dict)
        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = PublicPmResolvedEntry.from_dict(data_item_data)

            data.append(data_item)

        pagination = PublicPmPagination.from_dict(d.pop("pagination"))

        meta = PublicPmResolvedEventsResponseMeta.from_dict(d.pop("meta"))

        public_pm_resolved_events_response = cls(
            data=data,
            pagination=pagination,
            meta=meta,
        )

        return public_pm_resolved_events_response
