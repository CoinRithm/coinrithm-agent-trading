from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PmQuoteResponseEvent")


@_attrs_define
class PmQuoteResponseEvent:
    """
    Attributes:
        source (str | Unset):
        slug (str | Unset):
        title (str | Unset):
        status (str | Unset):
    """

    source: str | Unset = UNSET
    slug: str | Unset = UNSET
    title: str | Unset = UNSET
    status: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        source = self.source

        slug = self.slug

        title = self.title

        status = self.status

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if source is not UNSET:
            field_dict["source"] = source
        if slug is not UNSET:
            field_dict["slug"] = slug
        if title is not UNSET:
            field_dict["title"] = title
        if status is not UNSET:
            field_dict["status"] = status

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        source = d.pop("source", UNSET)

        slug = d.pop("slug", UNSET)

        title = d.pop("title", UNSET)

        status = d.pop("status", UNSET)

        pm_quote_response_event = cls(
            source=source,
            slug=slug,
            title=title,
            status=status,
        )

        pm_quote_response_event.additional_properties = d
        return pm_quote_response_event

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
