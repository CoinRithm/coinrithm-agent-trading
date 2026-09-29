from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.public_pm_event import PublicPmEvent
    from ..models.public_pm_expiring_events_response_meta import PublicPmExpiringEventsResponseMeta
    from ..models.public_pm_pagination import PublicPmPagination


T = TypeVar("T", bound="PublicPmExpiringEventsResponse")


@_attrs_define
class PublicPmExpiringEventsResponse:
    """
    Attributes:
        data (list[PublicPmEvent]): Each row is a PublicPmEvent that additionally carries `expiresInMs` (integer,
            milliseconds from fetch time to endDate); PublicPmEvent's open additionalProperties allows the extra field.
        pagination (PublicPmPagination):
        meta (PublicPmExpiringEventsResponseMeta):
    """

    data: list[PublicPmEvent]
    pagination: PublicPmPagination
    meta: PublicPmExpiringEventsResponseMeta

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
        from ..models.public_pm_event import PublicPmEvent
        from ..models.public_pm_expiring_events_response_meta import PublicPmExpiringEventsResponseMeta
        from ..models.public_pm_pagination import PublicPmPagination

        d = dict(src_dict)
        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = PublicPmEvent.from_dict(data_item_data)

            data.append(data_item)

        pagination = PublicPmPagination.from_dict(d.pop("pagination"))

        meta = PublicPmExpiringEventsResponseMeta.from_dict(d.pop("meta"))

        public_pm_expiring_events_response = cls(
            data=data,
            pagination=pagination,
            meta=meta,
        )

        return public_pm_expiring_events_response
