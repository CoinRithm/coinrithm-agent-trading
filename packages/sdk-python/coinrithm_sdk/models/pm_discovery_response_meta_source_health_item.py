from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_discovery_response_meta_source_health_item_status import PmDiscoveryResponseMetaSourceHealthItemStatus
from ..types import UNSET, Unset

T = TypeVar("T", bound="PmDiscoveryResponseMetaSourceHealthItem")


@_attrs_define
class PmDiscoveryResponseMetaSourceHealthItem:
    """
    Attributes:
        slug (str | Unset):
        last_ingest_at (datetime.datetime | None | Unset):
        ingest_age_seconds (int | None | Unset):
        status (PmDiscoveryResponseMetaSourceHealthItemStatus | Unset):
    """

    slug: str | Unset = UNSET
    last_ingest_at: datetime.datetime | None | Unset = UNSET
    ingest_age_seconds: int | None | Unset = UNSET
    status: PmDiscoveryResponseMetaSourceHealthItemStatus | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        slug = self.slug

        last_ingest_at: None | str | Unset
        if isinstance(self.last_ingest_at, Unset):
            last_ingest_at = UNSET
        elif isinstance(self.last_ingest_at, datetime.datetime):
            last_ingest_at = self.last_ingest_at.isoformat()
        else:
            last_ingest_at = self.last_ingest_at

        ingest_age_seconds: int | None | Unset
        if isinstance(self.ingest_age_seconds, Unset):
            ingest_age_seconds = UNSET
        else:
            ingest_age_seconds = self.ingest_age_seconds

        status: str | Unset = UNSET
        if not isinstance(self.status, Unset):
            status = self.status.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if slug is not UNSET:
            field_dict["slug"] = slug
        if last_ingest_at is not UNSET:
            field_dict["lastIngestAt"] = last_ingest_at
        if ingest_age_seconds is not UNSET:
            field_dict["ingestAgeSeconds"] = ingest_age_seconds
        if status is not UNSET:
            field_dict["status"] = status

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        slug = d.pop("slug", UNSET)

        def _parse_last_ingest_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                last_ingest_at_type_0 = datetime.datetime.fromisoformat(data)

                return last_ingest_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        last_ingest_at = _parse_last_ingest_at(d.pop("lastIngestAt", UNSET))

        def _parse_ingest_age_seconds(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        ingest_age_seconds = _parse_ingest_age_seconds(d.pop("ingestAgeSeconds", UNSET))

        _status = d.pop("status", UNSET)
        status: PmDiscoveryResponseMetaSourceHealthItemStatus | Unset
        if isinstance(_status, Unset):
            status = UNSET
        else:
            status = PmDiscoveryResponseMetaSourceHealthItemStatus(_status)

        pm_discovery_response_meta_source_health_item = cls(
            slug=slug,
            last_ingest_at=last_ingest_at,
            ingest_age_seconds=ingest_age_seconds,
            status=status,
        )

        pm_discovery_response_meta_source_health_item.additional_properties = d
        return pm_discovery_response_meta_source_health_item

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
