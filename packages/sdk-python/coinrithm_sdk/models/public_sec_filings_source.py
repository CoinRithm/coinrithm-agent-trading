from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicSecFilingsSource")


@_attrs_define
class PublicSecFilingsSource:
    """
    Attributes:
        name (str):
        url (str):
        publisher (str):
        forms (list[str]):
        issuer_filings_url (None | str): EDGAR list of this issuer's Form 4 filings, when known.
        note (str):
    """

    name: str
    url: str
    publisher: str
    forms: list[str]
    issuer_filings_url: None | str
    note: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        url = self.url

        publisher = self.publisher

        forms = self.forms

        issuer_filings_url: None | str
        issuer_filings_url = self.issuer_filings_url

        note = self.note

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "url": url,
                "publisher": publisher,
                "forms": forms,
                "issuerFilingsUrl": issuer_filings_url,
                "note": note,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        url = d.pop("url")

        publisher = d.pop("publisher")

        forms = cast(list[str], d.pop("forms"))

        def _parse_issuer_filings_url(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        issuer_filings_url = _parse_issuer_filings_url(d.pop("issuerFilingsUrl"))

        note = d.pop("note")

        public_sec_filings_source = cls(
            name=name,
            url=url,
            publisher=publisher,
            forms=forms,
            issuer_filings_url=issuer_filings_url,
            note=note,
        )

        public_sec_filings_source.additional_properties = d
        return public_sec_filings_source

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
