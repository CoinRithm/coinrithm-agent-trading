from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.public_pm_canonical_list_response_data_item import PublicPmCanonicalListResponseDataItem
    from ..models.public_pm_canonical_list_response_pagination import PublicPmCanonicalListResponsePagination


T = TypeVar("T", bound="PublicPmCanonicalListResponse")


@_attrs_define
class PublicPmCanonicalListResponse:
    """
    Attributes:
        data (list[PublicPmCanonicalListResponseDataItem]):
        pagination (PublicPmCanonicalListResponsePagination):
    """

    data: list[PublicPmCanonicalListResponseDataItem]
    pagination: PublicPmCanonicalListResponsePagination

    def to_dict(self) -> dict[str, Any]:
        data = []
        for data_item_data in self.data:
            data_item = data_item_data.to_dict()
            data.append(data_item)

        pagination = self.pagination.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "data": data,
                "pagination": pagination,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_canonical_list_response_data_item import PublicPmCanonicalListResponseDataItem
        from ..models.public_pm_canonical_list_response_pagination import PublicPmCanonicalListResponsePagination

        d = dict(src_dict)
        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = PublicPmCanonicalListResponseDataItem.from_dict(data_item_data)

            data.append(data_item)

        pagination = PublicPmCanonicalListResponsePagination.from_dict(d.pop("pagination"))

        public_pm_canonical_list_response = cls(
            data=data,
            pagination=pagination,
        )

        return public_pm_canonical_list_response
