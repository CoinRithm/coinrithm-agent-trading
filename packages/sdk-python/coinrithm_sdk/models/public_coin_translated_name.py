from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_coin_translated_name_translations import PublicCoinTranslatedNameTranslations


T = TypeVar("T", bound="PublicCoinTranslatedName")


@_attrs_define
class PublicCoinTranslatedName:
    """
    Attributes:
        name (str | Unset):
        translations (PublicCoinTranslatedNameTranslations | Unset): Display name by language code (de, en, es, fr, it,
            nl, pt, tr).
    """

    name: str | Unset = UNSET
    translations: PublicCoinTranslatedNameTranslations | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        translations: dict[str, Any] | Unset = UNSET
        if not isinstance(self.translations, Unset):
            translations = self.translations.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if name is not UNSET:
            field_dict["name"] = name
        if translations is not UNSET:
            field_dict["translations"] = translations

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

        public_coin_translated_name = cls(
            name=name,
            translations=translations,
        )

        public_coin_translated_name.additional_properties = d
        return public_coin_translated_name

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
