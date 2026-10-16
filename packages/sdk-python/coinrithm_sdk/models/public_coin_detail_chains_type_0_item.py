from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_coin_translated_name_translations import PublicCoinTranslatedNameTranslations


T = TypeVar("T", bound="PublicCoinDetailChainsType0Item")


@_attrs_define
class PublicCoinDetailChainsType0Item:
    """
    Attributes:
        name (str | Unset):
        translations (PublicCoinTranslatedNameTranslations | Unset): Display name by language code (de, en, es, fr, it,
            nl, pt, tr).
        short_name (str | Unset):
        icon (str | Unset):
        contract_address (str | Unset):
    """

    name: str | Unset = UNSET
    translations: PublicCoinTranslatedNameTranslations | Unset = UNSET
    short_name: str | Unset = UNSET
    icon: str | Unset = UNSET
    contract_address: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        translations: dict[str, Any] | Unset = UNSET
        if not isinstance(self.translations, Unset):
            translations = self.translations.to_dict()

        short_name = self.short_name

        icon = self.icon

        contract_address = self.contract_address

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if name is not UNSET:
            field_dict["name"] = name
        if translations is not UNSET:
            field_dict["translations"] = translations
        if short_name is not UNSET:
            field_dict["shortName"] = short_name
        if icon is not UNSET:
            field_dict["icon"] = icon
        if contract_address is not UNSET:
            field_dict["contractAddress"] = contract_address

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_coin_translated_name_translations import PublicCoinTranslatedNameTranslations

        d = dict(src_dict)
        name = d.pop("name", UNSET)

        _translations = d.pop("translations", UNSET)
        translations: PublicCoinTranslatedNameTranslations | Unset
        if isinstance(_translations, Unset):
            translations = UNSET
        else:
            translations = PublicCoinTranslatedNameTranslations.from_dict(_translations)

        short_name = d.pop("shortName", UNSET)

        icon = d.pop("icon", UNSET)

        contract_address = d.pop("contractAddress", UNSET)

        public_coin_detail_chains_type_0_item = cls(
            name=name,
            translations=translations,
            short_name=short_name,
            icon=icon,
            contract_address=contract_address,
        )

        public_coin_detail_chains_type_0_item.additional_properties = d
        return public_coin_detail_chains_type_0_item

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
