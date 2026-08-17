from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmCanonicalListResponseDataItem")


@_attrs_define
class PublicPmCanonicalListResponseDataItem:
    """
    Attributes:
        uuid (str | Unset):
        slug (str | Unset):
        title (str | Unset):
        revision (int | Unset):
        status (str | Unset):
        member_count (int | Unset):
        created_at (datetime.datetime | Unset):
        updated_at (datetime.datetime | Unset):
    """

    uuid: str | Unset = UNSET
    slug: str | Unset = UNSET
    title: str | Unset = UNSET
    revision: int | Unset = UNSET
    status: str | Unset = UNSET
    member_count: int | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        uuid = self.uuid

        slug = self.slug

        title = self.title

        revision = self.revision

        status = self.status

        member_count = self.member_count

        created_at: str | Unset = UNSET
        if not isinstance(self.created_at, Unset):
            created_at = self.created_at.isoformat()

        updated_at: str | Unset = UNSET
        if not isinstance(self.updated_at, Unset):
            updated_at = self.updated_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if uuid is not UNSET:
            field_dict["uuid"] = uuid
        if slug is not UNSET:
            field_dict["slug"] = slug
        if title is not UNSET:
            field_dict["title"] = title
        if revision is not UNSET:
            field_dict["revision"] = revision
        if status is not UNSET:
            field_dict["status"] = status
        if member_count is not UNSET:
            field_dict["memberCount"] = member_count
        if created_at is not UNSET:
            field_dict["createdAt"] = created_at
        if updated_at is not UNSET:
            field_dict["updatedAt"] = updated_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        uuid = d.pop("uuid", UNSET)

        slug = d.pop("slug", UNSET)

        title = d.pop("title", UNSET)

        revision = d.pop("revision", UNSET)

        status = d.pop("status", UNSET)

        member_count = d.pop("memberCount", UNSET)

        _created_at = d.pop("createdAt", UNSET)
        created_at: datetime.datetime | Unset
        if isinstance(_created_at, Unset):
            created_at = UNSET
        else:
            created_at = datetime.datetime.fromisoformat(_created_at)

        _updated_at = d.pop("updatedAt", UNSET)
        updated_at: datetime.datetime | Unset
        if isinstance(_updated_at, Unset):
            updated_at = UNSET
        else:
            updated_at = datetime.datetime.fromisoformat(_updated_at)

        public_pm_canonical_list_response_data_item = cls(
            uuid=uuid,
            slug=slug,
            title=title,
            revision=revision,
            status=status,
            member_count=member_count,
            created_at=created_at,
            updated_at=updated_at,
        )

        public_pm_canonical_list_response_data_item.additional_properties = d
        return public_pm_canonical_list_response_data_item

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
