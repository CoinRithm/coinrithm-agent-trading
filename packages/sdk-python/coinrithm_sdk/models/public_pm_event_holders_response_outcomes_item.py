from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_event_holder import PublicPmEventHolder


T = TypeVar("T", bound="PublicPmEventHoldersResponseOutcomesItem")


@_attrs_define
class PublicPmEventHoldersResponseOutcomesItem:
    """
    Attributes:
        name (str | Unset):
        external_market_id (str | Unset):
        token_id (str | Unset):
        available (bool | Unset):
        holders (list[PublicPmEventHolder] | Unset):
    """

    name: str | Unset = UNSET
    external_market_id: str | Unset = UNSET
    token_id: str | Unset = UNSET
    available: bool | Unset = UNSET
    holders: list[PublicPmEventHolder] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        external_market_id = self.external_market_id

        token_id = self.token_id

        available = self.available

        holders: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.holders, Unset):
            holders = []
            for holders_item_data in self.holders:
                holders_item = holders_item_data.to_dict()
                holders.append(holders_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if name is not UNSET:
            field_dict["name"] = name
        if external_market_id is not UNSET:
            field_dict["externalMarketId"] = external_market_id
        if token_id is not UNSET:
            field_dict["tokenId"] = token_id
        if available is not UNSET:
            field_dict["available"] = available
        if holders is not UNSET:
            field_dict["holders"] = holders

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_event_holder import PublicPmEventHolder

        d = dict(src_dict)
        name = d.pop("name", UNSET)

        external_market_id = d.pop("externalMarketId", UNSET)

        token_id = d.pop("tokenId", UNSET)

        available = d.pop("available", UNSET)

        _holders = d.pop("holders", UNSET)
        holders: list[PublicPmEventHolder] | Unset = UNSET
        if _holders is not UNSET:
            holders = []
            for holders_item_data in _holders:
                holders_item = PublicPmEventHolder.from_dict(holders_item_data)

                holders.append(holders_item)

        public_pm_event_holders_response_outcomes_item = cls(
            name=name,
            external_market_id=external_market_id,
            token_id=token_id,
            available=available,
            holders=holders,
        )

        public_pm_event_holders_response_outcomes_item.additional_properties = d
        return public_pm_event_holders_response_outcomes_item

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
