from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_paper_v2_discovery_response_meta_sources_item import PmPaperV2DiscoveryResponseMetaSourcesItem
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.pm_paper_v2_discovery_response_meta_bounded_selection import (
        PmPaperV2DiscoveryResponseMetaBoundedSelection,
    )
    from ..models.pm_paper_v2_discovery_response_meta_source_health_item import (
        PmPaperV2DiscoveryResponseMetaSourceHealthItem,
    )


T = TypeVar("T", bound="PmPaperV2DiscoveryResponseMeta")


@_attrs_define
class PmPaperV2DiscoveryResponseMeta:
    """
    Attributes:
        max_end_days (int | None): The house's scheduled-end horizon in days; null = no horizon filter.
        native_identity_basis (Literal['stored_exact_selected_market']):
        horizon_basis (Literal['scheduled_native_end_not_settlement_guarantee']):
        evaluated_at (datetime.datetime):
        bounded_selection (PmPaperV2DiscoveryResponseMetaBoundedSelection):
        note (str):
        source (Literal['all'] | Unset):
        sources (list[PmPaperV2DiscoveryResponseMetaSourcesItem] | Unset):
        source_health (list[PmPaperV2DiscoveryResponseMetaSourceHealthItem] | Unset):
        sort (Literal['best'] | Unset):
        q (None | str | Unset):
    """

    max_end_days: int | None
    native_identity_basis: Literal["stored_exact_selected_market"]
    horizon_basis: Literal["scheduled_native_end_not_settlement_guarantee"]
    evaluated_at: datetime.datetime
    bounded_selection: PmPaperV2DiscoveryResponseMetaBoundedSelection
    note: str
    source: Literal["all"] | Unset = UNSET
    sources: list[PmPaperV2DiscoveryResponseMetaSourcesItem] | Unset = UNSET
    source_health: list[PmPaperV2DiscoveryResponseMetaSourceHealthItem] | Unset = UNSET
    sort: Literal["best"] | Unset = UNSET
    q: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        max_end_days: int | None
        max_end_days = self.max_end_days

        native_identity_basis = self.native_identity_basis

        horizon_basis = self.horizon_basis

        evaluated_at = self.evaluated_at.isoformat()

        bounded_selection = self.bounded_selection.to_dict()

        note = self.note

        source = self.source

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

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "maxEndDays": max_end_days,
                "nativeIdentityBasis": native_identity_basis,
                "horizonBasis": horizon_basis,
                "evaluatedAt": evaluated_at,
                "boundedSelection": bounded_selection,
                "note": note,
            }
        )
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

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.pm_paper_v2_discovery_response_meta_bounded_selection import (
            PmPaperV2DiscoveryResponseMetaBoundedSelection,
        )
        from ..models.pm_paper_v2_discovery_response_meta_source_health_item import (
            PmPaperV2DiscoveryResponseMetaSourceHealthItem,
        )

        d = dict(src_dict)

        def _parse_max_end_days(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        max_end_days = _parse_max_end_days(d.pop("maxEndDays"))

        native_identity_basis = cast(Literal["stored_exact_selected_market"], d.pop("nativeIdentityBasis"))
        if native_identity_basis != "stored_exact_selected_market":
            raise ValueError(
                f"nativeIdentityBasis must match const 'stored_exact_selected_market', got '{native_identity_basis}'"
            )

        horizon_basis = cast(Literal["scheduled_native_end_not_settlement_guarantee"], d.pop("horizonBasis"))
        if horizon_basis != "scheduled_native_end_not_settlement_guarantee":
            raise ValueError(
                f"horizonBasis must match const 'scheduled_native_end_not_settlement_guarantee', got '{horizon_basis}'"
            )

        evaluated_at = datetime.datetime.fromisoformat(d.pop("evaluatedAt").replace("Z", "+00:00"))

        bounded_selection = PmPaperV2DiscoveryResponseMetaBoundedSelection.from_dict(d.pop("boundedSelection"))

        note = d.pop("note")

        source = cast(Literal["all"] | Unset, d.pop("source", UNSET))
        if source != "all" and not isinstance(source, Unset):
            raise ValueError(f"source must match const 'all', got '{source}'")

        _sources = d.pop("sources", UNSET)
        sources: list[PmPaperV2DiscoveryResponseMetaSourcesItem] | Unset = UNSET
        if _sources is not UNSET:
            sources = []
            for sources_item_data in _sources:
                sources_item = PmPaperV2DiscoveryResponseMetaSourcesItem(sources_item_data)

                sources.append(sources_item)

        _source_health = d.pop("sourceHealth", UNSET)
        source_health: list[PmPaperV2DiscoveryResponseMetaSourceHealthItem] | Unset = UNSET
        if _source_health is not UNSET:
            source_health = []
            for source_health_item_data in _source_health:
                source_health_item = PmPaperV2DiscoveryResponseMetaSourceHealthItem.from_dict(source_health_item_data)

                source_health.append(source_health_item)

        sort = cast(Literal["best"] | Unset, d.pop("sort", UNSET))
        if sort != "best" and not isinstance(sort, Unset):
            raise ValueError(f"sort must match const 'best', got '{sort}'")

        def _parse_q(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        q = _parse_q(d.pop("q", UNSET))

        pm_paper_v2_discovery_response_meta = cls(
            max_end_days=max_end_days,
            native_identity_basis=native_identity_basis,
            horizon_basis=horizon_basis,
            evaluated_at=evaluated_at,
            bounded_selection=bounded_selection,
            note=note,
            source=source,
            sources=sources,
            source_health=source_health,
            sort=sort,
            q=q,
        )

        pm_paper_v2_discovery_response_meta.additional_properties = d
        return pm_paper_v2_discovery_response_meta

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
