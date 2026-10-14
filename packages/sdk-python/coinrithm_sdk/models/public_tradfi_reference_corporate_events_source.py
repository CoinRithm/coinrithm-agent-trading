from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_tradfi_reference_corporate_events_source_name import PublicTradfiReferenceCorporateEventsSourceName

T = TypeVar("T", bound="PublicTradfiReferenceCorporateEventsSource")


@_attrs_define
class PublicTradfiReferenceCorporateEventsSource:
    """
    Attributes:
        name (PublicTradfiReferenceCorporateEventsSourceName):
        url (str): The issuer's 8-K filing list.
    """

    name: PublicTradfiReferenceCorporateEventsSourceName
    url: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name.value

        url = self.url

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "url": url,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = PublicTradfiReferenceCorporateEventsSourceName(d.pop("name"))

        url = d.pop("url")

        public_tradfi_reference_corporate_events_source = cls(
            name=name,
            url=url,
        )

        public_tradfi_reference_corporate_events_source.additional_properties = d
        return public_tradfi_reference_corporate_events_source

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
