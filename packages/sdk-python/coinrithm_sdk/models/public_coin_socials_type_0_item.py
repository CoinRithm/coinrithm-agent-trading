from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicCoinSocialsType0Item")


@_attrs_define
class PublicCoinSocialsType0Item:
    """
    Attributes:
        url (str | Unset):
        social_id (int | Unset):
        name (str | Unset):
        icon (str | Unset):
    """

    url: str | Unset = UNSET
    social_id: int | Unset = UNSET
    name: str | Unset = UNSET
    icon: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        url = self.url

        social_id = self.social_id

        name = self.name

        icon = self.icon

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if url is not UNSET:
            field_dict["url"] = url
        if social_id is not UNSET:
            field_dict["socialId"] = social_id
        if name is not UNSET:
            field_dict["name"] = name
        if icon is not UNSET:
            field_dict["icon"] = icon

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        url = d.pop("url", UNSET)

        social_id = d.pop("socialId", UNSET)

        name = d.pop("name", UNSET)

        icon = d.pop("icon", UNSET)

        public_coin_socials_type_0_item = cls(
            url=url,
            social_id=social_id,
            name=name,
            icon=icon,
        )

        public_coin_socials_type_0_item.additional_properties = d
        return public_coin_socials_type_0_item

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
