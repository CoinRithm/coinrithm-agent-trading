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
  from ..models.public_pm_event_cross_platform_item import PublicPmEventCrossPlatformItem
  from ..models.public_pm_event_decision_support_type_0 import PublicPmEventDecisionSupportType0
  from ..models.public_pm_event_freshness import PublicPmEventFreshness
  from ..models.public_pm_event_quality_type_0 import PublicPmEventQualityType0
  from ..models.public_pm_event_reference_probability_type_0 import PublicPmEventReferenceProbabilityType0
  from ..models.public_pm_outcome import PublicPmOutcome
  from ..models.public_pm_source import PublicPmSource





T = TypeVar("T", bound="PublicPmEvent")



@_attrs_define
class PublicPmEvent:
    """ 
        Attributes:
            id (str):
            slug (str):
            title (str):
            status (str):
            source (PublicPmSource):
            outcomes (list[PublicPmOutcome]):
            description (None | str | Unset):
            start_date (datetime.datetime | None | Unset):
            end_date (datetime.datetime | None | Unset):
            resolved_at (datetime.datetime | None | Unset):
            freshness (PublicPmEventFreshness | Unset): Observation time, age and source-aware freshness state.
            volume (float | None | Unset):
            volume24h (float | None | Unset):
            liquidity (float | None | Unset):
            best_bid (float | None | Unset):
            best_ask (float | None | Unset):
            spread (float | None | Unset):
            reference_probability (None | PublicPmEventReferenceProbabilityType0 | Unset): Canonical matched-venue reference
                with venue count and spread.
            decision_support (None | PublicPmEventDecisionSupportType0 | Unset):
            quality (None | PublicPmEventQualityType0 | Unset): Persisted truth-engine decision eligibility and reason
                codes.
            cross_platform (list[PublicPmEventCrossPlatformItem] | Unset):
     """

    id: str
    slug: str
    title: str
    status: str
    source: PublicPmSource
    outcomes: list[PublicPmOutcome]
    description: None | str | Unset = UNSET
    start_date: datetime.datetime | None | Unset = UNSET
    end_date: datetime.datetime | None | Unset = UNSET
    resolved_at: datetime.datetime | None | Unset = UNSET
    freshness: PublicPmEventFreshness | Unset = UNSET
    volume: float | None | Unset = UNSET
    volume24h: float | None | Unset = UNSET
    liquidity: float | None | Unset = UNSET
    best_bid: float | None | Unset = UNSET
    best_ask: float | None | Unset = UNSET
    spread: float | None | Unset = UNSET
    reference_probability: None | PublicPmEventReferenceProbabilityType0 | Unset = UNSET
    decision_support: None | PublicPmEventDecisionSupportType0 | Unset = UNSET
    quality: None | PublicPmEventQualityType0 | Unset = UNSET
    cross_platform: list[PublicPmEventCrossPlatformItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.public_pm_event_cross_platform_item import PublicPmEventCrossPlatformItem
        from ..models.public_pm_event_decision_support_type_0 import PublicPmEventDecisionSupportType0
        from ..models.public_pm_event_freshness import PublicPmEventFreshness
        from ..models.public_pm_event_quality_type_0 import PublicPmEventQualityType0
        from ..models.public_pm_event_reference_probability_type_0 import PublicPmEventReferenceProbabilityType0
        from ..models.public_pm_outcome import PublicPmOutcome
        from ..models.public_pm_source import PublicPmSource
        id = self.id

        slug = self.slug

        title = self.title

        status = self.status

        source = self.source.to_dict()

        outcomes = []
        for outcomes_item_data in self.outcomes:
            outcomes_item = outcomes_item_data.to_dict()
            outcomes.append(outcomes_item)



        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        start_date: None | str | Unset
        if isinstance(self.start_date, Unset):
            start_date = UNSET
        elif isinstance(self.start_date, datetime.datetime):
            start_date = self.start_date.isoformat()
        else:
            start_date = self.start_date

        end_date: None | str | Unset
        if isinstance(self.end_date, Unset):
            end_date = UNSET
        elif isinstance(self.end_date, datetime.datetime):
            end_date = self.end_date.isoformat()
        else:
            end_date = self.end_date

        resolved_at: None | str | Unset
        if isinstance(self.resolved_at, Unset):
            resolved_at = UNSET
        elif isinstance(self.resolved_at, datetime.datetime):
            resolved_at = self.resolved_at.isoformat()
        else:
            resolved_at = self.resolved_at

        freshness: dict[str, Any] | Unset = UNSET
        if not isinstance(self.freshness, Unset):
            freshness = self.freshness.to_dict()

        volume: float | None | Unset
        if isinstance(self.volume, Unset):
            volume = UNSET
        else:
            volume = self.volume

        volume24h: float | None | Unset
        if isinstance(self.volume24h, Unset):
            volume24h = UNSET
        else:
            volume24h = self.volume24h

        liquidity: float | None | Unset
        if isinstance(self.liquidity, Unset):
            liquidity = UNSET
        else:
            liquidity = self.liquidity

        best_bid: float | None | Unset
        if isinstance(self.best_bid, Unset):
            best_bid = UNSET
        else:
            best_bid = self.best_bid

        best_ask: float | None | Unset
        if isinstance(self.best_ask, Unset):
            best_ask = UNSET
        else:
            best_ask = self.best_ask

        spread: float | None | Unset
        if isinstance(self.spread, Unset):
            spread = UNSET
        else:
            spread = self.spread

        reference_probability: dict[str, Any] | None | Unset
        if isinstance(self.reference_probability, Unset):
            reference_probability = UNSET
        elif isinstance(self.reference_probability, PublicPmEventReferenceProbabilityType0):
            reference_probability = self.reference_probability.to_dict()
        else:
            reference_probability = self.reference_probability

        decision_support: dict[str, Any] | None | Unset
        if isinstance(self.decision_support, Unset):
            decision_support = UNSET
        elif isinstance(self.decision_support, PublicPmEventDecisionSupportType0):
            decision_support = self.decision_support.to_dict()
        else:
            decision_support = self.decision_support

        quality: dict[str, Any] | None | Unset
        if isinstance(self.quality, Unset):
            quality = UNSET
        elif isinstance(self.quality, PublicPmEventQualityType0):
            quality = self.quality.to_dict()
        else:
            quality = self.quality

        cross_platform: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.cross_platform, Unset):
            cross_platform = []
            for cross_platform_item_data in self.cross_platform:
                cross_platform_item = cross_platform_item_data.to_dict()
                cross_platform.append(cross_platform_item)




        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "id": id,
            "slug": slug,
            "title": title,
            "status": status,
            "source": source,
            "outcomes": outcomes,
        })
        if description is not UNSET:
            field_dict["description"] = description
        if start_date is not UNSET:
            field_dict["startDate"] = start_date
        if end_date is not UNSET:
            field_dict["endDate"] = end_date
        if resolved_at is not UNSET:
            field_dict["resolvedAt"] = resolved_at
        if freshness is not UNSET:
            field_dict["freshness"] = freshness
        if volume is not UNSET:
            field_dict["volume"] = volume
        if volume24h is not UNSET:
            field_dict["volume24h"] = volume24h
        if liquidity is not UNSET:
            field_dict["liquidity"] = liquidity
        if best_bid is not UNSET:
            field_dict["bestBid"] = best_bid
        if best_ask is not UNSET:
            field_dict["bestAsk"] = best_ask
        if spread is not UNSET:
            field_dict["spread"] = spread
        if reference_probability is not UNSET:
            field_dict["referenceProbability"] = reference_probability
        if decision_support is not UNSET:
            field_dict["decisionSupport"] = decision_support
        if quality is not UNSET:
            field_dict["quality"] = quality
        if cross_platform is not UNSET:
            field_dict["crossPlatform"] = cross_platform

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_event_cross_platform_item import PublicPmEventCrossPlatformItem
        from ..models.public_pm_event_decision_support_type_0 import PublicPmEventDecisionSupportType0
        from ..models.public_pm_event_freshness import PublicPmEventFreshness
        from ..models.public_pm_event_quality_type_0 import PublicPmEventQualityType0
        from ..models.public_pm_event_reference_probability_type_0 import PublicPmEventReferenceProbabilityType0
        from ..models.public_pm_outcome import PublicPmOutcome
        from ..models.public_pm_source import PublicPmSource
        d = dict(src_dict)
        id = d.pop("id")

        slug = d.pop("slug")

        title = d.pop("title")

        status = d.pop("status")

        source = PublicPmSource.from_dict(d.pop("source"))




        outcomes = []
        _outcomes = d.pop("outcomes")
        for outcomes_item_data in (_outcomes):
            outcomes_item = PublicPmOutcome.from_dict(outcomes_item_data)



            outcomes.append(outcomes_item)


        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))


        def _parse_start_date(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                start_date_type_0 = isoparse(data)



                return start_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        start_date = _parse_start_date(d.pop("startDate", UNSET))


        def _parse_end_date(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                end_date_type_0 = isoparse(data)



                return end_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        end_date = _parse_end_date(d.pop("endDate", UNSET))


        def _parse_resolved_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                resolved_at_type_0 = isoparse(data)



                return resolved_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        resolved_at = _parse_resolved_at(d.pop("resolvedAt", UNSET))


        _freshness = d.pop("freshness", UNSET)
        freshness: PublicPmEventFreshness | Unset
        if isinstance(_freshness,  Unset):
            freshness = UNSET
        else:
            freshness = PublicPmEventFreshness.from_dict(_freshness)




        def _parse_volume(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        volume = _parse_volume(d.pop("volume", UNSET))


        def _parse_volume24h(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        volume24h = _parse_volume24h(d.pop("volume24h", UNSET))


        def _parse_liquidity(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        liquidity = _parse_liquidity(d.pop("liquidity", UNSET))


        def _parse_best_bid(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        best_bid = _parse_best_bid(d.pop("bestBid", UNSET))


        def _parse_best_ask(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        best_ask = _parse_best_ask(d.pop("bestAsk", UNSET))


        def _parse_spread(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        spread = _parse_spread(d.pop("spread", UNSET))


        def _parse_reference_probability(data: object) -> None | PublicPmEventReferenceProbabilityType0 | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                reference_probability_type_0 = PublicPmEventReferenceProbabilityType0.from_dict(data)



                return reference_probability_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicPmEventReferenceProbabilityType0 | Unset, data)

        reference_probability = _parse_reference_probability(d.pop("referenceProbability", UNSET))


        def _parse_decision_support(data: object) -> None | PublicPmEventDecisionSupportType0 | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                decision_support_type_0 = PublicPmEventDecisionSupportType0.from_dict(data)



                return decision_support_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicPmEventDecisionSupportType0 | Unset, data)

        decision_support = _parse_decision_support(d.pop("decisionSupport", UNSET))


        def _parse_quality(data: object) -> None | PublicPmEventQualityType0 | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                quality_type_0 = PublicPmEventQualityType0.from_dict(data)



                return quality_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicPmEventQualityType0 | Unset, data)

        quality = _parse_quality(d.pop("quality", UNSET))


        _cross_platform = d.pop("crossPlatform", UNSET)
        cross_platform: list[PublicPmEventCrossPlatformItem] | Unset = UNSET
        if _cross_platform is not UNSET:
            cross_platform = []
            for cross_platform_item_data in _cross_platform:
                cross_platform_item = PublicPmEventCrossPlatformItem.from_dict(cross_platform_item_data)



                cross_platform.append(cross_platform_item)


        public_pm_event = cls(
            id=id,
            slug=slug,
            title=title,
            status=status,
            source=source,
            outcomes=outcomes,
            description=description,
            start_date=start_date,
            end_date=end_date,
            resolved_at=resolved_at,
            freshness=freshness,
            volume=volume,
            volume24h=volume24h,
            liquidity=liquidity,
            best_bid=best_bid,
            best_ask=best_ask,
            spread=spread,
            reference_probability=reference_probability,
            decision_support=decision_support,
            quality=quality,
            cross_platform=cross_platform,
        )


        public_pm_event.additional_properties = d
        return public_pm_event

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
