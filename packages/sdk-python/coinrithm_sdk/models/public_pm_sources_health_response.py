from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime

if TYPE_CHECKING:
  from ..models.public_pm_sources_health_response_degraded_item import PublicPmSourcesHealthResponseDegradedItem
  from ..models.public_pm_sources_health_response_enrichment import PublicPmSourcesHealthResponseEnrichment
  from ..models.public_pm_sources_health_response_sources_item import PublicPmSourcesHealthResponseSourcesItem
  from ..models.public_pm_sources_health_response_summary import PublicPmSourcesHealthResponseSummary
  from ..models.public_pm_sources_health_response_thresholds import PublicPmSourcesHealthResponseThresholds





T = TypeVar("T", bound="PublicPmSourcesHealthResponse")



@_attrs_define
class PublicPmSourcesHealthResponse:
    """ 
        Attributes:
            as_of (datetime.datetime):
            summary (PublicPmSourcesHealthResponseSummary):
            degraded (list[PublicPmSourcesHealthResponseDegradedItem]): Venues currently failing one or more health checks.
            sources (list[PublicPmSourcesHealthResponseSourcesItem]):
            thresholds (PublicPmSourcesHealthResponseThresholds | Unset):
            enrichment (PublicPmSourcesHealthResponseEnrichment | Unset):
     """

    as_of: datetime.datetime
    summary: PublicPmSourcesHealthResponseSummary
    degraded: list[PublicPmSourcesHealthResponseDegradedItem]
    sources: list[PublicPmSourcesHealthResponseSourcesItem]
    thresholds: PublicPmSourcesHealthResponseThresholds | Unset = UNSET
    enrichment: PublicPmSourcesHealthResponseEnrichment | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.public_pm_sources_health_response_degraded_item import PublicPmSourcesHealthResponseDegradedItem
        from ..models.public_pm_sources_health_response_enrichment import PublicPmSourcesHealthResponseEnrichment
        from ..models.public_pm_sources_health_response_sources_item import PublicPmSourcesHealthResponseSourcesItem
        from ..models.public_pm_sources_health_response_summary import PublicPmSourcesHealthResponseSummary
        from ..models.public_pm_sources_health_response_thresholds import PublicPmSourcesHealthResponseThresholds
        as_of = self.as_of.isoformat()

        summary = self.summary.to_dict()

        degraded = []
        for degraded_item_data in self.degraded:
            degraded_item = degraded_item_data.to_dict()
            degraded.append(degraded_item)



        sources = []
        for sources_item_data in self.sources:
            sources_item = sources_item_data.to_dict()
            sources.append(sources_item)



        thresholds: dict[str, Any] | Unset = UNSET
        if not isinstance(self.thresholds, Unset):
            thresholds = self.thresholds.to_dict()

        enrichment: dict[str, Any] | Unset = UNSET
        if not isinstance(self.enrichment, Unset):
            enrichment = self.enrichment.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "asOf": as_of,
            "summary": summary,
            "degraded": degraded,
            "sources": sources,
        })
        if thresholds is not UNSET:
            field_dict["thresholds"] = thresholds
        if enrichment is not UNSET:
            field_dict["enrichment"] = enrichment

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_sources_health_response_degraded_item import PublicPmSourcesHealthResponseDegradedItem
        from ..models.public_pm_sources_health_response_enrichment import PublicPmSourcesHealthResponseEnrichment
        from ..models.public_pm_sources_health_response_sources_item import PublicPmSourcesHealthResponseSourcesItem
        from ..models.public_pm_sources_health_response_summary import PublicPmSourcesHealthResponseSummary
        from ..models.public_pm_sources_health_response_thresholds import PublicPmSourcesHealthResponseThresholds
        d = dict(src_dict)
        as_of = isoparse(d.pop("asOf"))




        summary = PublicPmSourcesHealthResponseSummary.from_dict(d.pop("summary"))




        degraded = []
        _degraded = d.pop("degraded")
        for degraded_item_data in (_degraded):
            degraded_item = PublicPmSourcesHealthResponseDegradedItem.from_dict(degraded_item_data)



            degraded.append(degraded_item)


        sources = []
        _sources = d.pop("sources")
        for sources_item_data in (_sources):
            sources_item = PublicPmSourcesHealthResponseSourcesItem.from_dict(sources_item_data)



            sources.append(sources_item)


        _thresholds = d.pop("thresholds", UNSET)
        thresholds: PublicPmSourcesHealthResponseThresholds | Unset
        if isinstance(_thresholds,  Unset):
            thresholds = UNSET
        else:
            thresholds = PublicPmSourcesHealthResponseThresholds.from_dict(_thresholds)




        _enrichment = d.pop("enrichment", UNSET)
        enrichment: PublicPmSourcesHealthResponseEnrichment | Unset
        if isinstance(_enrichment,  Unset):
            enrichment = UNSET
        else:
            enrichment = PublicPmSourcesHealthResponseEnrichment.from_dict(_enrichment)




        public_pm_sources_health_response = cls(
            as_of=as_of,
            summary=summary,
            degraded=degraded,
            sources=sources,
            thresholds=thresholds,
            enrichment=enrichment,
        )

        return public_pm_sources_health_response

