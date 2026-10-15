from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_disagreements_response_data_item_comparisons_item_pair import (
        PublicPmDisagreementsResponseDataItemComparisonsItemPair,
    )


T = TypeVar("T", bound="PublicPmDisagreementsResponseDataItemComparisonsItem")


@_attrs_define
class PublicPmDisagreementsResponseDataItemComparisonsItem:
    """
    Attributes:
        event_id (str | Unset):
        pair (PublicPmDisagreementsResponseDataItemComparisonsItemPair | Unset):
    """

    event_id: str | Unset = UNSET
    pair: PublicPmDisagreementsResponseDataItemComparisonsItemPair | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        event_id = self.event_id

        pair: dict[str, Any] | Unset = UNSET
        if not isinstance(self.pair, Unset):
            pair = self.pair.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if event_id is not UNSET:
            field_dict["eventId"] = event_id
        if pair is not UNSET:
            field_dict["pair"] = pair

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_disagreements_response_data_item_comparisons_item_pair import (
            PublicPmDisagreementsResponseDataItemComparisonsItemPair,
        )

        d = dict(src_dict)
        event_id = d.pop("eventId", UNSET)

        _pair = d.pop("pair", UNSET)
        pair: PublicPmDisagreementsResponseDataItemComparisonsItemPair | Unset
        if isinstance(_pair, Unset):
            pair = UNSET
        else:
            pair = PublicPmDisagreementsResponseDataItemComparisonsItemPair.from_dict(_pair)

        public_pm_disagreements_response_data_item_comparisons_item = cls(
            event_id=event_id,
            pair=pair,
        )

        public_pm_disagreements_response_data_item_comparisons_item.additional_properties = d
        return public_pm_disagreements_response_data_item_comparisons_item

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
