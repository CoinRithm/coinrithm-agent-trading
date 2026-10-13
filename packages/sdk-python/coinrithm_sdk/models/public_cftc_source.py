from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicCftcSource")


@_attrs_define
class PublicCftcSource:
    """
    Attributes:
        name (str):
        url (str):
        publisher (str):
        dataset (str):
        dataset_url (str):
        note (str):
    """

    name: str
    url: str
    publisher: str
    dataset: str
    dataset_url: str
    note: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        url = self.url

        publisher = self.publisher

        dataset = self.dataset

        dataset_url = self.dataset_url

        note = self.note

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "url": url,
                "publisher": publisher,
                "dataset": dataset,
                "datasetUrl": dataset_url,
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

        dataset = d.pop("dataset")

        dataset_url = d.pop("datasetUrl")

        note = d.pop("note")

        public_cftc_source = cls(
            name=name,
            url=url,
            publisher=publisher,
            dataset=dataset,
            dataset_url=dataset_url,
            note=note,
        )

        public_cftc_source.additional_properties = d
        return public_cftc_source

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
