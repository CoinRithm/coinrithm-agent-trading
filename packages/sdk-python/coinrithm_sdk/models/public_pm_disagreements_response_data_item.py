from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_disagreements_response_data_item_comparisons_item import (
        PublicPmDisagreementsResponseDataItemComparisonsItem,
    )


T = TypeVar("T", bound="PublicPmDisagreementsResponseDataItem")


@_attrs_define
class PublicPmDisagreementsResponseDataItem:
    """
    Attributes:
        comparisons (list[PublicPmDisagreementsResponseDataItemComparisonsItem] | Unset):
    """

    comparisons: list[PublicPmDisagreementsResponseDataItemComparisonsItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        comparisons: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.comparisons, Unset):
            comparisons = []
            for comparisons_item_data in self.comparisons:
                comparisons_item = comparisons_item_data.to_dict()
                comparisons.append(comparisons_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if comparisons is not UNSET:
            field_dict["comparisons"] = comparisons

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_disagreements_response_data_item_comparisons_item import (
            PublicPmDisagreementsResponseDataItemComparisonsItem,
        )

        d = dict(src_dict)
        _comparisons = d.pop("comparisons", UNSET)
        comparisons: list[PublicPmDisagreementsResponseDataItemComparisonsItem] | Unset = UNSET
        if _comparisons is not UNSET:
            comparisons = []
            for comparisons_item_data in _comparisons:
                comparisons_item = PublicPmDisagreementsResponseDataItemComparisonsItem.from_dict(comparisons_item_data)

                comparisons.append(comparisons_item)

        public_pm_disagreements_response_data_item = cls(
            comparisons=comparisons,
        )

        public_pm_disagreements_response_data_item.additional_properties = d
        return public_pm_disagreements_response_data_item

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
