from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.pm_paper_v2_discovery_market import PmPaperV2DiscoveryMarket
    from ..models.pm_paper_v2_discovery_response_meta import PmPaperV2DiscoveryResponseMeta
    from ..models.pm_paper_v2_discovery_response_pagination import PmPaperV2DiscoveryResponsePagination


T = TypeVar("T", bound="PmPaperV2DiscoveryResponse")


@_attrs_define
class PmPaperV2DiscoveryResponse:
    """
    Attributes:
        execution_model (Literal['pm_paper_v2']):
        data (list[PmPaperV2DiscoveryMarket]):
        pagination (PmPaperV2DiscoveryResponsePagination): Page of the unfiltered event list (offset is always 0).
        meta (PmPaperV2DiscoveryResponseMeta):
    """

    execution_model: Literal["pm_paper_v2"]
    data: list[PmPaperV2DiscoveryMarket]
    pagination: PmPaperV2DiscoveryResponsePagination
    meta: PmPaperV2DiscoveryResponseMeta
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        execution_model = self.execution_model

        data = []
        for data_item_data in self.data:
            data_item = data_item_data.to_dict()
            data.append(data_item)

        pagination = self.pagination.to_dict()

        meta = self.meta.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "executionModel": execution_model,
                "data": data,
                "pagination": pagination,
                "meta": meta,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.pm_paper_v2_discovery_market import PmPaperV2DiscoveryMarket
        from ..models.pm_paper_v2_discovery_response_meta import PmPaperV2DiscoveryResponseMeta
        from ..models.pm_paper_v2_discovery_response_pagination import PmPaperV2DiscoveryResponsePagination

        d = dict(src_dict)
        execution_model = cast(Literal["pm_paper_v2"], d.pop("executionModel"))
        if execution_model != "pm_paper_v2":
            raise ValueError(f"executionModel must match const 'pm_paper_v2', got '{execution_model}'")

        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = PmPaperV2DiscoveryMarket.from_dict(data_item_data)

            data.append(data_item)

        pagination = PmPaperV2DiscoveryResponsePagination.from_dict(d.pop("pagination"))

        meta = PmPaperV2DiscoveryResponseMeta.from_dict(d.pop("meta"))

        pm_paper_v2_discovery_response = cls(
            execution_model=execution_model,
            data=data,
            pagination=pagination,
            meta=meta,
        )

        pm_paper_v2_discovery_response.additional_properties = d
        return pm_paper_v2_discovery_response

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
