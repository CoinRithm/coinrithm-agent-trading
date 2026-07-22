from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.pm_discovery_response_meta_source import PmDiscoveryResponseMetaSource
from ..models.pm_discovery_response_meta_sources_item import PmDiscoveryResponseMetaSourcesItem
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.pm_discovery_response_meta_source_health_item import PmDiscoveryResponseMetaSourceHealthItem





T = TypeVar("T", bound="PmDiscoveryResponseMeta")



@_attrs_define
class PmDiscoveryResponseMeta:
    """ 
        Attributes:
            source (PmDiscoveryResponseMetaSource | Unset):
            sources (list[PmDiscoveryResponseMetaSourcesItem] | Unset):
            source_health (list[PmDiscoveryResponseMetaSourceHealthItem] | Unset): Per-source ingestion freshness derived
                from aggregator-updated source rows.
            sort (str | Unset):
            q (None | str | Unset):
            note (str | Unset):
     """

    source: PmDiscoveryResponseMetaSource | Unset = UNSET
    sources: list[PmDiscoveryResponseMetaSourcesItem] | Unset = UNSET
    source_health: list[PmDiscoveryResponseMetaSourceHealthItem] | Unset = UNSET
    sort: str | Unset = UNSET
    q: None | str | Unset = UNSET
    note: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.pm_discovery_response_meta_source_health_item import PmDiscoveryResponseMetaSourceHealthItem
        source: str | Unset = UNSET
        if not isinstance(self.source, Unset):
            source = self.source.value


        sources: list[str] | Unset = UNSET
        if not isinstance(self.sources, Unset):
            sources = []
            for sources_item_data in self.sources:
                sources_item = sources_item_data.value
                sources.append(sources_item)



        source_health: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.source_health, Unset):
            source_health = []
            for source_health_item_data in self.source_health:
                source_health_item = source_health_item_data.to_dict()
                source_health.append(source_health_item)



        sort = self.sort

        q: None | str | Unset
        if isinstance(self.q, Unset):
            q = UNSET
        else:
            q = self.q

        note = self.note


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if source is not UNSET:
            field_dict["source"] = source
        if sources is not UNSET:
            field_dict["sources"] = sources
        if source_health is not UNSET:
            field_dict["sourceHealth"] = source_health
        if sort is not UNSET:
            field_dict["sort"] = sort
        if q is not UNSET:
            field_dict["q"] = q
        if note is not UNSET:
            field_dict["note"] = note

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.pm_discovery_response_meta_source_health_item import PmDiscoveryResponseMetaSourceHealthItem
        d = dict(src_dict)
        _source = d.pop("source", UNSET)
        source: PmDiscoveryResponseMetaSource | Unset
        if isinstance(_source,  Unset):
            source = UNSET
        else:
            source = PmDiscoveryResponseMetaSource(_source)




        _sources = d.pop("sources", UNSET)
        sources: list[PmDiscoveryResponseMetaSourcesItem] | Unset = UNSET
        if _sources is not UNSET:
            sources = []
            for sources_item_data in _sources:
                sources_item = PmDiscoveryResponseMetaSourcesItem(sources_item_data)



                sources.append(sources_item)


        _source_health = d.pop("sourceHealth", UNSET)
        source_health: list[PmDiscoveryResponseMetaSourceHealthItem] | Unset = UNSET
        if _source_health is not UNSET:
            source_health = []
            for source_health_item_data in _source_health:
                source_health_item = PmDiscoveryResponseMetaSourceHealthItem.from_dict(source_health_item_data)



                source_health.append(source_health_item)


        sort = d.pop("sort", UNSET)

        def _parse_q(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        q = _parse_q(d.pop("q", UNSET))


        note = d.pop("note", UNSET)

        pm_discovery_response_meta = cls(
            source=source,
            sources=sources,
            source_health=source_health,
            sort=sort,
            q=q,
            note=note,
        )


        pm_discovery_response_meta.additional_properties = d
        return pm_discovery_response_meta

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
