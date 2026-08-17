from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_pm_canonical_detail_response_members_item_orientation import (
    PublicPmCanonicalDetailResponseMembersItemOrientation,
)
from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmCanonicalDetailResponseMembersItem")


@_attrs_define
class PublicPmCanonicalDetailResponseMembersItem:
    """
    Attributes:
        source (str | Unset):
        source_name (str | Unset):
        event_slug (str | Unset):
        event_title (str | Unset):
        event_status (str | Unset):
        is_anchor (bool | Unset):
        orientation (PublicPmCanonicalDetailResponseMembersItemOrientation | Unset):
        confidence (float | Unset):
        basis (None | str | Unset):
    """

    source: str | Unset = UNSET
    source_name: str | Unset = UNSET
    event_slug: str | Unset = UNSET
    event_title: str | Unset = UNSET
    event_status: str | Unset = UNSET
    is_anchor: bool | Unset = UNSET
    orientation: PublicPmCanonicalDetailResponseMembersItemOrientation | Unset = UNSET
    confidence: float | Unset = UNSET
    basis: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        source = self.source

        source_name = self.source_name

        event_slug = self.event_slug

        event_title = self.event_title

        event_status = self.event_status

        is_anchor = self.is_anchor

        orientation: str | Unset = UNSET
        if not isinstance(self.orientation, Unset):
            orientation = self.orientation.value

        confidence = self.confidence

        basis: None | str | Unset
        if isinstance(self.basis, Unset):
            basis = UNSET
        else:
            basis = self.basis

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if source is not UNSET:
            field_dict["source"] = source
        if source_name is not UNSET:
            field_dict["sourceName"] = source_name
        if event_slug is not UNSET:
            field_dict["eventSlug"] = event_slug
        if event_title is not UNSET:
            field_dict["eventTitle"] = event_title
        if event_status is not UNSET:
            field_dict["eventStatus"] = event_status
        if is_anchor is not UNSET:
            field_dict["isAnchor"] = is_anchor
        if orientation is not UNSET:
            field_dict["orientation"] = orientation
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if basis is not UNSET:
            field_dict["basis"] = basis

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        source = d.pop("source", UNSET)

        source_name = d.pop("sourceName", UNSET)

        event_slug = d.pop("eventSlug", UNSET)

        event_title = d.pop("eventTitle", UNSET)

        event_status = d.pop("eventStatus", UNSET)

        is_anchor = d.pop("isAnchor", UNSET)

        _orientation = d.pop("orientation", UNSET)
        orientation: PublicPmCanonicalDetailResponseMembersItemOrientation | Unset
        if isinstance(_orientation, Unset):
            orientation = UNSET
        else:
            orientation = PublicPmCanonicalDetailResponseMembersItemOrientation(_orientation)

        confidence = d.pop("confidence", UNSET)

        def _parse_basis(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        basis = _parse_basis(d.pop("basis", UNSET))

        public_pm_canonical_detail_response_members_item = cls(
            source=source,
            source_name=source_name,
            event_slug=event_slug,
            event_title=event_title,
            event_status=event_status,
            is_anchor=is_anchor,
            orientation=orientation,
            confidence=confidence,
            basis=basis,
        )

        public_pm_canonical_detail_response_members_item.additional_properties = d
        return public_pm_canonical_detail_response_members_item

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
