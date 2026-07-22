from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.public_pm_source_slug import PublicPmSourceSlug
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime

if TYPE_CHECKING:
  from ..models.public_pm_sources_health_response_sources_item_catalog import PublicPmSourcesHealthResponseSourcesItemCatalog





T = TypeVar("T", bound="PublicPmSourcesHealthResponseSourcesItem")



@_attrs_define
class PublicPmSourcesHealthResponseSourcesItem:
    """ 
        Attributes:
            id (PublicPmSourceSlug | Unset):
            name (str | Unset):
            is_active (bool | Unset):
            last_ingest_at (datetime.datetime | None | Unset):
            lag_seconds (float | None | Unset):
            freshness (str | Unset):
            open_events (int | Unset):
            total_events (int | Unset):
            catalog (PublicPmSourcesHealthResponseSourcesItemCatalog | Unset): Latest sweep evidence and provider-bounded
                completeness truth.
            degraded (list[str] | Unset): Empty when healthy; otherwise stable reason codes.
     """

    id: PublicPmSourceSlug | Unset = UNSET
    name: str | Unset = UNSET
    is_active: bool | Unset = UNSET
    last_ingest_at: datetime.datetime | None | Unset = UNSET
    lag_seconds: float | None | Unset = UNSET
    freshness: str | Unset = UNSET
    open_events: int | Unset = UNSET
    total_events: int | Unset = UNSET
    catalog: PublicPmSourcesHealthResponseSourcesItemCatalog | Unset = UNSET
    degraded: list[str] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.public_pm_sources_health_response_sources_item_catalog import PublicPmSourcesHealthResponseSourcesItemCatalog
        id: str | Unset = UNSET
        if not isinstance(self.id, Unset):
            id = self.id.value


        name = self.name

        is_active = self.is_active

        last_ingest_at: None | str | Unset
        if isinstance(self.last_ingest_at, Unset):
            last_ingest_at = UNSET
        elif isinstance(self.last_ingest_at, datetime.datetime):
            last_ingest_at = self.last_ingest_at.isoformat()
        else:
            last_ingest_at = self.last_ingest_at

        lag_seconds: float | None | Unset
        if isinstance(self.lag_seconds, Unset):
            lag_seconds = UNSET
        else:
            lag_seconds = self.lag_seconds

        freshness = self.freshness

        open_events = self.open_events

        total_events = self.total_events

        catalog: dict[str, Any] | Unset = UNSET
        if not isinstance(self.catalog, Unset):
            catalog = self.catalog.to_dict()

        degraded: list[str] | Unset = UNSET
        if not isinstance(self.degraded, Unset):
            degraded = self.degraded




        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if id is not UNSET:
            field_dict["id"] = id
        if name is not UNSET:
            field_dict["name"] = name
        if is_active is not UNSET:
            field_dict["isActive"] = is_active
        if last_ingest_at is not UNSET:
            field_dict["lastIngestAt"] = last_ingest_at
        if lag_seconds is not UNSET:
            field_dict["lagSeconds"] = lag_seconds
        if freshness is not UNSET:
            field_dict["freshness"] = freshness
        if open_events is not UNSET:
            field_dict["openEvents"] = open_events
        if total_events is not UNSET:
            field_dict["totalEvents"] = total_events
        if catalog is not UNSET:
            field_dict["catalog"] = catalog
        if degraded is not UNSET:
            field_dict["degraded"] = degraded

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_sources_health_response_sources_item_catalog import PublicPmSourcesHealthResponseSourcesItemCatalog
        d = dict(src_dict)
        _id = d.pop("id", UNSET)
        id: PublicPmSourceSlug | Unset
        if isinstance(_id,  Unset):
            id = UNSET
        else:
            id = PublicPmSourceSlug(_id)




        name = d.pop("name", UNSET)

        is_active = d.pop("isActive", UNSET)

        def _parse_last_ingest_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                last_ingest_at_type_0 = isoparse(data)



                return last_ingest_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        last_ingest_at = _parse_last_ingest_at(d.pop("lastIngestAt", UNSET))


        def _parse_lag_seconds(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        lag_seconds = _parse_lag_seconds(d.pop("lagSeconds", UNSET))


        freshness = d.pop("freshness", UNSET)

        open_events = d.pop("openEvents", UNSET)

        total_events = d.pop("totalEvents", UNSET)

        _catalog = d.pop("catalog", UNSET)
        catalog: PublicPmSourcesHealthResponseSourcesItemCatalog | Unset
        if isinstance(_catalog,  Unset):
            catalog = UNSET
        else:
            catalog = PublicPmSourcesHealthResponseSourcesItemCatalog.from_dict(_catalog)




        degraded = cast(list[str], d.pop("degraded", UNSET))


        public_pm_sources_health_response_sources_item = cls(
            id=id,
            name=name,
            is_active=is_active,
            last_ingest_at=last_ingest_at,
            lag_seconds=lag_seconds,
            freshness=freshness,
            open_events=open_events,
            total_events=total_events,
            catalog=catalog,
            degraded=degraded,
        )


        public_pm_sources_health_response_sources_item.additional_properties = d
        return public_pm_sources_health_response_sources_item

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
