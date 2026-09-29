from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.public_pm_pagination import PublicPmPagination
    from ..models.public_pm_surprise_entry import PublicPmSurpriseEntry


T = TypeVar("T", bound="PublicPmSurprisesResponse")


@_attrs_define
class PublicPmSurprisesResponse:
    """
    Attributes:
        data (list[PublicPmSurpriseEntry]):
        window (str): The window applied, echoed from the request (`7d`, `30d`, `90d` or `all`; unknown requests are
            served as `all`).
        pagination (PublicPmPagination):
    """

    data: list[PublicPmSurpriseEntry]
    window: str
    pagination: PublicPmPagination

    def to_dict(self) -> dict[str, Any]:
        data = []
        for data_item_data in self.data:
            data_item = data_item_data.to_dict()
            data.append(data_item)

        window = self.window

        pagination = self.pagination.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "data": data,
                "window": window,
                "pagination": pagination,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_pagination import PublicPmPagination
        from ..models.public_pm_surprise_entry import PublicPmSurpriseEntry

        d = dict(src_dict)
        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = PublicPmSurpriseEntry.from_dict(data_item_data)

            data.append(data_item)

        window = d.pop("window")

        pagination = PublicPmPagination.from_dict(d.pop("pagination"))

        public_pm_surprises_response = cls(
            data=data,
            window=window,
            pagination=pagination,
        )

        return public_pm_surprises_response
