from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.competition_meta_status import CompetitionMetaStatus
from ..models.competition_meta_visibility import CompetitionMetaVisibility
from ..types import UNSET, Unset

T = TypeVar("T", bound="CompetitionMeta")


@_attrs_define
class CompetitionMeta:
    """Public competition metadata — no ids, owners, or invite codes.

    Attributes:
        slug (str | Unset):
        name (str | Unset):
        description (None | str | Unset):
        visibility (CompetitionMetaVisibility | Unset):
        featured (bool | Unset):
        starts_at (datetime.datetime | Unset):
        ends_at (datetime.datetime | Unset):
        status (CompetitionMetaStatus | Unset):
        created_at (datetime.datetime | Unset):
        entry_count (int | Unset):
    """

    slug: str | Unset = UNSET
    name: str | Unset = UNSET
    description: None | str | Unset = UNSET
    visibility: CompetitionMetaVisibility | Unset = UNSET
    featured: bool | Unset = UNSET
    starts_at: datetime.datetime | Unset = UNSET
    ends_at: datetime.datetime | Unset = UNSET
    status: CompetitionMetaStatus | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    entry_count: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        slug = self.slug

        name = self.name

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        visibility: str | Unset = UNSET
        if not isinstance(self.visibility, Unset):
            visibility = self.visibility.value

        featured = self.featured

        starts_at: str | Unset = UNSET
        if not isinstance(self.starts_at, Unset):
            starts_at = self.starts_at.isoformat()

        ends_at: str | Unset = UNSET
        if not isinstance(self.ends_at, Unset):
            ends_at = self.ends_at.isoformat()

        status: str | Unset = UNSET
        if not isinstance(self.status, Unset):
            status = self.status.value

        created_at: str | Unset = UNSET
        if not isinstance(self.created_at, Unset):
            created_at = self.created_at.isoformat()

        entry_count = self.entry_count

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if slug is not UNSET:
            field_dict["slug"] = slug
        if name is not UNSET:
            field_dict["name"] = name
        if description is not UNSET:
            field_dict["description"] = description
        if visibility is not UNSET:
            field_dict["visibility"] = visibility
        if featured is not UNSET:
            field_dict["featured"] = featured
        if starts_at is not UNSET:
            field_dict["startsAt"] = starts_at
        if ends_at is not UNSET:
            field_dict["endsAt"] = ends_at
        if status is not UNSET:
            field_dict["status"] = status
        if created_at is not UNSET:
            field_dict["createdAt"] = created_at
        if entry_count is not UNSET:
            field_dict["entryCount"] = entry_count

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        slug = d.pop("slug", UNSET)

        name = d.pop("name", UNSET)

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))

        _visibility = d.pop("visibility", UNSET)
        visibility: CompetitionMetaVisibility | Unset
        if isinstance(_visibility, Unset):
            visibility = UNSET
        else:
            visibility = CompetitionMetaVisibility(_visibility)

        featured = d.pop("featured", UNSET)

        _starts_at = d.pop("startsAt", UNSET)
        starts_at: datetime.datetime | Unset
        if isinstance(_starts_at, Unset):
            starts_at = UNSET
        else:
            starts_at = datetime.datetime.fromisoformat(_starts_at)

        _ends_at = d.pop("endsAt", UNSET)
        ends_at: datetime.datetime | Unset
        if isinstance(_ends_at, Unset):
            ends_at = UNSET
        else:
            ends_at = datetime.datetime.fromisoformat(_ends_at)

        _status = d.pop("status", UNSET)
        status: CompetitionMetaStatus | Unset
        if isinstance(_status, Unset):
            status = UNSET
        else:
            status = CompetitionMetaStatus(_status)

        _created_at = d.pop("createdAt", UNSET)
        created_at: datetime.datetime | Unset
        if isinstance(_created_at, Unset):
            created_at = UNSET
        else:
            created_at = datetime.datetime.fromisoformat(_created_at)

        entry_count = d.pop("entryCount", UNSET)

        competition_meta = cls(
            slug=slug,
            name=name,
            description=description,
            visibility=visibility,
            featured=featured,
            starts_at=starts_at,
            ends_at=ends_at,
            status=status,
            created_at=created_at,
            entry_count=entry_count,
        )

        competition_meta.additional_properties = d
        return competition_meta

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
