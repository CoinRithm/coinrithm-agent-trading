from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_pm_source_slug import PublicPmSourceSlug
from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmSource")


@_attrs_define
class PublicPmSource:
    """
    Attributes:
        id (PublicPmSourceSlug):
        name (str):
        kind (str | Unset):
        supports_trading (bool | Unset):
    """

    id: PublicPmSourceSlug
    name: str
    kind: str | Unset = UNSET
    supports_trading: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id.value

        name = self.name

        kind = self.kind

        supports_trading = self.supports_trading

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "name": name,
            }
        )
        if kind is not UNSET:
            field_dict["kind"] = kind
        if supports_trading is not UNSET:
            field_dict["supportsTrading"] = supports_trading

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = PublicPmSourceSlug(d.pop("id"))

        name = d.pop("name")

        kind = d.pop("kind", UNSET)

        supports_trading = d.pop("supportsTrading", UNSET)

        public_pm_source = cls(
            id=id,
            name=name,
            kind=kind,
            supports_trading=supports_trading,
        )

        public_pm_source.additional_properties = d
        return public_pm_source

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
