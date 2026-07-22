from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.arena_opportunity_opportunity_kind import ArenaOpportunityOpportunityKind
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
from uuid import UUID
import datetime

if TYPE_CHECKING:
  from ..models.decision_provenance import DecisionProvenance
  from ..models.entry_context import EntryContext
  from ..models.opportunity_cohort_context import OpportunityCohortContext





T = TypeVar("T", bound="ArenaOpportunity")



@_attrs_define
class ArenaOpportunity:
    """ A NON-opened opportunity (dataset v2, `?includeOpportunities=true`): a
    decision the agent surface evaluated but did NOT open (blocked,
    unpriceable, risk-rejected, abstained). No fill and no settlement, so
    fill-only fields are honestly absent.

        Attributes:
            decision_uuid (UUID | Unset):
            schema_version (int | None | Unset):
            opportunity_kind (ArenaOpportunityOpportunityKind | Unset):
            reason_code (None | str | Unset):
            content_hash (None | str | Unset):
            agent (str | Unset):
            agent_model (None | str | Unset): Self-reported; unverified.
            venue (None | str | Unset): Source slug; null if the event/source was pruned.
            event_title (None | str | Unset):
            event_slug (None | str | Unset):
            event_id (int | None | Unset):
            side (None | str | Unset):
            chosen_outcome (None | str | Unset):
            agent_forecast_probability (float | None | Unset):
            market_probability (float | None | Unset):
            reference_probability (float | None | Unset):
            reference_venue_count (int | None | Unset):
            edge_points (float | None | Unset):
            created_at (datetime.datetime | Unset):
            entry_context (EntryContext | None | Unset): Frozen market snapshot for capture-forward REJECTION rows (opened
                via the PM open path). null for endpoint-reported opportunities, which carry `cohort` instead (never both).
            cohort (None | OpportunityCohortContext | Unset): Frozen opportunity-cohort descriptor (universeSize / horizon)
                for rows reported via POST /api/agent/pm/opportunity (abstained / forecast_only / quote_expired). null for
                rejection rows, which carry `entryContext`.
            provenance (DecisionProvenance | None | Unset): v2 (schemaVersion 2). WHAT RAN to produce the opportunity.
                `null` on
                schemaVersion-1 rows (no provenance block was reported).
     """

    decision_uuid: UUID | Unset = UNSET
    schema_version: int | None | Unset = UNSET
    opportunity_kind: ArenaOpportunityOpportunityKind | Unset = UNSET
    reason_code: None | str | Unset = UNSET
    content_hash: None | str | Unset = UNSET
    agent: str | Unset = UNSET
    agent_model: None | str | Unset = UNSET
    venue: None | str | Unset = UNSET
    event_title: None | str | Unset = UNSET
    event_slug: None | str | Unset = UNSET
    event_id: int | None | Unset = UNSET
    side: None | str | Unset = UNSET
    chosen_outcome: None | str | Unset = UNSET
    agent_forecast_probability: float | None | Unset = UNSET
    market_probability: float | None | Unset = UNSET
    reference_probability: float | None | Unset = UNSET
    reference_venue_count: int | None | Unset = UNSET
    edge_points: float | None | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    entry_context: EntryContext | None | Unset = UNSET
    cohort: None | OpportunityCohortContext | Unset = UNSET
    provenance: DecisionProvenance | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.decision_provenance import DecisionProvenance
        from ..models.entry_context import EntryContext
        from ..models.opportunity_cohort_context import OpportunityCohortContext
        decision_uuid: str | Unset = UNSET
        if not isinstance(self.decision_uuid, Unset):
            decision_uuid = str(self.decision_uuid)

        schema_version: int | None | Unset
        if isinstance(self.schema_version, Unset):
            schema_version = UNSET
        else:
            schema_version = self.schema_version

        opportunity_kind: str | Unset = UNSET
        if not isinstance(self.opportunity_kind, Unset):
            opportunity_kind = self.opportunity_kind.value


        reason_code: None | str | Unset
        if isinstance(self.reason_code, Unset):
            reason_code = UNSET
        else:
            reason_code = self.reason_code

        content_hash: None | str | Unset
        if isinstance(self.content_hash, Unset):
            content_hash = UNSET
        else:
            content_hash = self.content_hash

        agent = self.agent

        agent_model: None | str | Unset
        if isinstance(self.agent_model, Unset):
            agent_model = UNSET
        else:
            agent_model = self.agent_model

        venue: None | str | Unset
        if isinstance(self.venue, Unset):
            venue = UNSET
        else:
            venue = self.venue

        event_title: None | str | Unset
        if isinstance(self.event_title, Unset):
            event_title = UNSET
        else:
            event_title = self.event_title

        event_slug: None | str | Unset
        if isinstance(self.event_slug, Unset):
            event_slug = UNSET
        else:
            event_slug = self.event_slug

        event_id: int | None | Unset
        if isinstance(self.event_id, Unset):
            event_id = UNSET
        else:
            event_id = self.event_id

        side: None | str | Unset
        if isinstance(self.side, Unset):
            side = UNSET
        else:
            side = self.side

        chosen_outcome: None | str | Unset
        if isinstance(self.chosen_outcome, Unset):
            chosen_outcome = UNSET
        else:
            chosen_outcome = self.chosen_outcome

        agent_forecast_probability: float | None | Unset
        if isinstance(self.agent_forecast_probability, Unset):
            agent_forecast_probability = UNSET
        else:
            agent_forecast_probability = self.agent_forecast_probability

        market_probability: float | None | Unset
        if isinstance(self.market_probability, Unset):
            market_probability = UNSET
        else:
            market_probability = self.market_probability

        reference_probability: float | None | Unset
        if isinstance(self.reference_probability, Unset):
            reference_probability = UNSET
        else:
            reference_probability = self.reference_probability

        reference_venue_count: int | None | Unset
        if isinstance(self.reference_venue_count, Unset):
            reference_venue_count = UNSET
        else:
            reference_venue_count = self.reference_venue_count

        edge_points: float | None | Unset
        if isinstance(self.edge_points, Unset):
            edge_points = UNSET
        else:
            edge_points = self.edge_points

        created_at: str | Unset = UNSET
        if not isinstance(self.created_at, Unset):
            created_at = self.created_at.isoformat()

        entry_context: dict[str, Any] | None | Unset
        if isinstance(self.entry_context, Unset):
            entry_context = UNSET
        elif isinstance(self.entry_context, EntryContext):
            entry_context = self.entry_context.to_dict()
        else:
            entry_context = self.entry_context

        cohort: dict[str, Any] | None | Unset
        if isinstance(self.cohort, Unset):
            cohort = UNSET
        elif isinstance(self.cohort, OpportunityCohortContext):
            cohort = self.cohort.to_dict()
        else:
            cohort = self.cohort

        provenance: dict[str, Any] | None | Unset
        if isinstance(self.provenance, Unset):
            provenance = UNSET
        elif isinstance(self.provenance, DecisionProvenance):
            provenance = self.provenance.to_dict()
        else:
            provenance = self.provenance


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if decision_uuid is not UNSET:
            field_dict["decisionUuid"] = decision_uuid
        if schema_version is not UNSET:
            field_dict["schemaVersion"] = schema_version
        if opportunity_kind is not UNSET:
            field_dict["opportunityKind"] = opportunity_kind
        if reason_code is not UNSET:
            field_dict["reasonCode"] = reason_code
        if content_hash is not UNSET:
            field_dict["contentHash"] = content_hash
        if agent is not UNSET:
            field_dict["agent"] = agent
        if agent_model is not UNSET:
            field_dict["agentModel"] = agent_model
        if venue is not UNSET:
            field_dict["venue"] = venue
        if event_title is not UNSET:
            field_dict["eventTitle"] = event_title
        if event_slug is not UNSET:
            field_dict["eventSlug"] = event_slug
        if event_id is not UNSET:
            field_dict["eventId"] = event_id
        if side is not UNSET:
            field_dict["side"] = side
        if chosen_outcome is not UNSET:
            field_dict["chosenOutcome"] = chosen_outcome
        if agent_forecast_probability is not UNSET:
            field_dict["agentForecastProbability"] = agent_forecast_probability
        if market_probability is not UNSET:
            field_dict["marketProbability"] = market_probability
        if reference_probability is not UNSET:
            field_dict["referenceProbability"] = reference_probability
        if reference_venue_count is not UNSET:
            field_dict["referenceVenueCount"] = reference_venue_count
        if edge_points is not UNSET:
            field_dict["edgePoints"] = edge_points
        if created_at is not UNSET:
            field_dict["createdAt"] = created_at
        if entry_context is not UNSET:
            field_dict["entryContext"] = entry_context
        if cohort is not UNSET:
            field_dict["cohort"] = cohort
        if provenance is not UNSET:
            field_dict["provenance"] = provenance

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.decision_provenance import DecisionProvenance
        from ..models.entry_context import EntryContext
        from ..models.opportunity_cohort_context import OpportunityCohortContext
        d = dict(src_dict)
        _decision_uuid = d.pop("decisionUuid", UNSET)
        decision_uuid: UUID | Unset
        if isinstance(_decision_uuid,  Unset):
            decision_uuid = UNSET
        else:
            decision_uuid = UUID(_decision_uuid)




        def _parse_schema_version(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        schema_version = _parse_schema_version(d.pop("schemaVersion", UNSET))


        _opportunity_kind = d.pop("opportunityKind", UNSET)
        opportunity_kind: ArenaOpportunityOpportunityKind | Unset
        if isinstance(_opportunity_kind,  Unset):
            opportunity_kind = UNSET
        else:
            opportunity_kind = ArenaOpportunityOpportunityKind(_opportunity_kind)




        def _parse_reason_code(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        reason_code = _parse_reason_code(d.pop("reasonCode", UNSET))


        def _parse_content_hash(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        content_hash = _parse_content_hash(d.pop("contentHash", UNSET))


        agent = d.pop("agent", UNSET)

        def _parse_agent_model(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        agent_model = _parse_agent_model(d.pop("agentModel", UNSET))


        def _parse_venue(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        venue = _parse_venue(d.pop("venue", UNSET))


        def _parse_event_title(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        event_title = _parse_event_title(d.pop("eventTitle", UNSET))


        def _parse_event_slug(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        event_slug = _parse_event_slug(d.pop("eventSlug", UNSET))


        def _parse_event_id(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        event_id = _parse_event_id(d.pop("eventId", UNSET))


        def _parse_side(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        side = _parse_side(d.pop("side", UNSET))


        def _parse_chosen_outcome(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        chosen_outcome = _parse_chosen_outcome(d.pop("chosenOutcome", UNSET))


        def _parse_agent_forecast_probability(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        agent_forecast_probability = _parse_agent_forecast_probability(d.pop("agentForecastProbability", UNSET))


        def _parse_market_probability(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        market_probability = _parse_market_probability(d.pop("marketProbability", UNSET))


        def _parse_reference_probability(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        reference_probability = _parse_reference_probability(d.pop("referenceProbability", UNSET))


        def _parse_reference_venue_count(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        reference_venue_count = _parse_reference_venue_count(d.pop("referenceVenueCount", UNSET))


        def _parse_edge_points(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        edge_points = _parse_edge_points(d.pop("edgePoints", UNSET))


        _created_at = d.pop("createdAt", UNSET)
        created_at: datetime.datetime | Unset
        if isinstance(_created_at,  Unset):
            created_at = UNSET
        else:
            created_at = isoparse(_created_at)




        def _parse_entry_context(data: object) -> EntryContext | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                entry_context_type_0 = EntryContext.from_dict(data)



                return entry_context_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(EntryContext | None | Unset, data)

        entry_context = _parse_entry_context(d.pop("entryContext", UNSET))


        def _parse_cohort(data: object) -> None | OpportunityCohortContext | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                cohort_type_0 = OpportunityCohortContext.from_dict(data)



                return cohort_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | OpportunityCohortContext | Unset, data)

        cohort = _parse_cohort(d.pop("cohort", UNSET))


        def _parse_provenance(data: object) -> DecisionProvenance | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                provenance_type_0 = DecisionProvenance.from_dict(data)



                return provenance_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(DecisionProvenance | None | Unset, data)

        provenance = _parse_provenance(d.pop("provenance", UNSET))


        arena_opportunity = cls(
            decision_uuid=decision_uuid,
            schema_version=schema_version,
            opportunity_kind=opportunity_kind,
            reason_code=reason_code,
            content_hash=content_hash,
            agent=agent,
            agent_model=agent_model,
            venue=venue,
            event_title=event_title,
            event_slug=event_slug,
            event_id=event_id,
            side=side,
            chosen_outcome=chosen_outcome,
            agent_forecast_probability=agent_forecast_probability,
            market_probability=market_probability,
            reference_probability=reference_probability,
            reference_venue_count=reference_venue_count,
            edge_points=edge_points,
            created_at=created_at,
            entry_context=entry_context,
            cohort=cohort,
            provenance=provenance,
        )


        arena_opportunity.additional_properties = d
        return arena_opportunity

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
