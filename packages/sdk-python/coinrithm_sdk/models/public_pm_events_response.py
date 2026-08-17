from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_event import PublicPmEvent
    from ..models.public_pm_events_response_meta import PublicPmEventsResponseMeta
    from ..models.public_pm_events_response_pagination import PublicPmEventsResponsePagination


T = TypeVar("T", bound="PublicPmEventsResponse")


@_attrs_define
class PublicPmEventsResponse:
    """
    Attributes:
        data (list[PublicPmEvent]):
        pagination (PublicPmEventsResponsePagination):
        meta (PublicPmEventsResponseMeta | Unset):
    """

    data: list[PublicPmEvent]
    pagination: PublicPmEventsResponsePagination
    meta: PublicPmEventsResponseMeta | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        data = []
        for data_item_data in self.data:
            data_item = data_item_data.to_dict()
            data.append(data_item)

        pagination = self.pagination.to_dict()

        meta: dict[str, Any] | Unset = UNSET
        if not isinstance(self.meta, Unset):
            meta = self.meta.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "data": data,
                "pagination": pagination,
            }
        )
        if meta is not UNSET:
            field_dict["meta"] = meta

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_event import PublicPmEvent
        from ..models.public_pm_events_response_meta import PublicPmEventsResponseMeta
        from ..models.public_pm_events_response_pagination import PublicPmEventsResponsePagination

        d = dict(src_dict)
        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = PublicPmEvent.from_dict(data_item_data)

            data.append(data_item)

        pagination = PublicPmEventsResponsePagination.from_dict(d.pop("pagination"))

        _meta = d.pop("meta", UNSET)
        meta: PublicPmEventsResponseMeta | Unset
        if isinstance(_meta, Unset):
            meta = UNSET
        else:
            meta = PublicPmEventsResponseMeta.from_dict(_meta)

        public_pm_events_response = cls(
            data=data,
            pagination=pagination,
            meta=meta,
        )

        return public_pm_events_response
