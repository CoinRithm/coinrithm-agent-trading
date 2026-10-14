from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_tradfi_reference_fundamentals_source_name import PublicTradfiReferenceFundamentalsSourceName

T = TypeVar("T", bound="PublicTradfiReferenceFundamentalsSource")


@_attrs_define
class PublicTradfiReferenceFundamentalsSource:
    """
    Attributes:
        name (PublicTradfiReferenceFundamentalsSourceName):
        publisher (str):
        url (str): EDGAR filing list of the issuer.
        data_url (str): The XBRL companyfacts JSON the values were derived from.
        note (str):
    """

    name: PublicTradfiReferenceFundamentalsSourceName
    publisher: str
    url: str
    data_url: str
    note: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name.value

        publisher = self.publisher

        url = self.url

        data_url = self.data_url

        note = self.note

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "publisher": publisher,
                "url": url,
                "dataUrl": data_url,
                "note": note,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = PublicTradfiReferenceFundamentalsSourceName(d.pop("name"))

        publisher = d.pop("publisher")

        url = d.pop("url")

        data_url = d.pop("dataUrl")

        note = d.pop("note")

        public_tradfi_reference_fundamentals_source = cls(
            name=name,
            publisher=publisher,
            url=url,
            data_url=data_url,
            note=note,
        )

        public_tradfi_reference_fundamentals_source.additional_properties = d
        return public_tradfi_reference_fundamentals_source

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
