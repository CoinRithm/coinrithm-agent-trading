from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_comparison import PublicPmComparison


T = TypeVar("T", bound="PublicPmEventDetailResponseCrossSourceMatchesItem")


@_attrs_define
class PublicPmEventDetailResponseCrossSourceMatchesItem:
    """
    Attributes:
        comparison (PublicPmComparison | Unset): One approved cross-source pair compared outcome by outcome. Every
            field is optional in this contract; absent fields mean an older
            server, never false or zero.
    """

    comparison: PublicPmComparison | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        comparison: dict[str, Any] | Unset = UNSET
        if not isinstance(self.comparison, Unset):
            comparison = self.comparison.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if comparison is not UNSET:
            field_dict["comparison"] = comparison

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_comparison import PublicPmComparison

        d = dict(src_dict)
        _comparison = d.pop("comparison", UNSET)
        comparison: PublicPmComparison | Unset
        if isinstance(_comparison, Unset):
            comparison = UNSET
        else:
            comparison = PublicPmComparison.from_dict(_comparison)

        public_pm_event_detail_response_cross_source_matches_item = cls(
            comparison=comparison,
        )

        public_pm_event_detail_response_cross_source_matches_item.additional_properties = d
        return public_pm_event_detail_response_cross_source_matches_item

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
