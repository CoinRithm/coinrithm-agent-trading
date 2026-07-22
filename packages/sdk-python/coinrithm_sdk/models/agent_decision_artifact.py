from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.agent_decision_artifact_opportunity_kind import AgentDecisionArtifactOpportunityKind
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
from uuid import UUID
import datetime

if TYPE_CHECKING:
  from ..models.decision_provenance import DecisionProvenance
  from ..models.entry_context import EntryContext





T = TypeVar("T", bound="AgentDecisionArtifact")



@_attrs_define
class AgentDecisionArtifact:
    """ The immutable, independently-verifiable artifact for one decision (dataset
    v2 public proof). All stored decision fields plus the schema/hash/policy
    versions and the ordered `contentHashFields` list, so a third party can
    recompute and verify `contentHash` off exactly these fields.

        Attributes:
            decision_uuid (UUID | Unset):
            schema_version (int | None | Unset):
            content_hash (None | str | Unset): Canonical SHA-256 of the decision-defining fields (see contentHashFields).
            content_hash_fields (list[str] | Unset): The ORDERED field list `contentHash` canonically covers — reproduce
                the hash off exactly these fields of this response.
            opportunity_kind (AgentDecisionArtifactOpportunityKind | Unset):
            reason_code (None | str | Unset):
            result (str | Unset): The decision outcome/state as stored.
            evaluation_policy_version (str | Unset):  Example: eval-1.
            execution_policy_version (str | Unset):  Example: paper_execution_v1.
            api_key_id (int | None | Unset): The public integer already embedded in `agent` (the handle is
                `a{apiKeyId}-{slug}`). One of `contentHashFields`, so it is served
                explicitly — a verifier reproduces `contentHash` off the response
                fields alone, without parsing the handle. Non-sensitive.
            agent (str | Unset): Public agent handle, `a{apiKeyId}-{slug}` (matches the Arena board).
            agent_model (None | str | Unset): Self-reported; unverified.
            venue (None | str | Unset): Source slug; null if the source was pruned.
            event_title (None | str | Unset):
            event_slug (None | str | Unset):
            event_id (int | None | Unset):
            side (None | str | Unset):
            chosen_outcome (None | str | Unset):
            agent_forecast_probability (float | None | Unset): The agent's OWN forecast for the chosen side at open, 0-100;
                null if none reported.
            market_probability (float | None | Unset): Market price paid for the chosen side at entry, 0-100.
            reference_probability (float | None | Unset): Cross-venue reference probability at entry, 0-100.
            reference_venue_count (int | None | Unset):
            edge_points (float | None | Unset): The agent's claimed edge in probability points (agentForecast minus market).
            run_id (None | str | Unset):
            decision_id (None | str | Unset): Client-supplied decision id (self-reported).
            decision_context (EntryContext | None | Unset): Frozen market snapshot at decision time; null for pre-capture
                rows.
            provenance (DecisionProvenance | None | Unset): v2 (schemaVersion 2). WHAT RAN to produce the decision — one of
                `contentHashFields` for a v2 row, so a verifier reproduces the hash off
                this field. `null` on schemaVersion-1 rows (never back-filled).
            settlement_label (None | str | Unset): Later lifecycle stamp (NOT part of contentHash); null until the linked
                position settles.
            settled_at (datetime.datetime | None | Unset):
            created_at (datetime.datetime | Unset):
     """

    decision_uuid: UUID | Unset = UNSET
    schema_version: int | None | Unset = UNSET
    content_hash: None | str | Unset = UNSET
    content_hash_fields: list[str] | Unset = UNSET
    opportunity_kind: AgentDecisionArtifactOpportunityKind | Unset = UNSET
    reason_code: None | str | Unset = UNSET
    result: str | Unset = UNSET
    evaluation_policy_version: str | Unset = UNSET
    execution_policy_version: str | Unset = UNSET
    api_key_id: int | None | Unset = UNSET
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
    run_id: None | str | Unset = UNSET
    decision_id: None | str | Unset = UNSET
    decision_context: EntryContext | None | Unset = UNSET
    provenance: DecisionProvenance | None | Unset = UNSET
    settlement_label: None | str | Unset = UNSET
    settled_at: datetime.datetime | None | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.decision_provenance import DecisionProvenance
        from ..models.entry_context import EntryContext
        decision_uuid: str | Unset = UNSET
        if not isinstance(self.decision_uuid, Unset):
            decision_uuid = str(self.decision_uuid)

        schema_version: int | None | Unset
        if isinstance(self.schema_version, Unset):
            schema_version = UNSET
        else:
            schema_version = self.schema_version

        content_hash: None | str | Unset
        if isinstance(self.content_hash, Unset):
            content_hash = UNSET
        else:
            content_hash = self.content_hash

        content_hash_fields: list[str] | Unset = UNSET
        if not isinstance(self.content_hash_fields, Unset):
            content_hash_fields = self.content_hash_fields



        opportunity_kind: str | Unset = UNSET
        if not isinstance(self.opportunity_kind, Unset):
            opportunity_kind = self.opportunity_kind.value


        reason_code: None | str | Unset
        if isinstance(self.reason_code, Unset):
            reason_code = UNSET
        else:
            reason_code = self.reason_code

        result = self.result

        evaluation_policy_version = self.evaluation_policy_version

        execution_policy_version = self.execution_policy_version

        api_key_id: int | None | Unset
        if isinstance(self.api_key_id, Unset):
            api_key_id = UNSET
        else:
            api_key_id = self.api_key_id

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

        run_id: None | str | Unset
        if isinstance(self.run_id, Unset):
            run_id = UNSET
        else:
            run_id = self.run_id

        decision_id: None | str | Unset
        if isinstance(self.decision_id, Unset):
            decision_id = UNSET
        else:
            decision_id = self.decision_id

        decision_context: dict[str, Any] | None | Unset
        if isinstance(self.decision_context, Unset):
            decision_context = UNSET
        elif isinstance(self.decision_context, EntryContext):
            decision_context = self.decision_context.to_dict()
        else:
            decision_context = self.decision_context

        provenance: dict[str, Any] | None | Unset
        if isinstance(self.provenance, Unset):
            provenance = UNSET
        elif isinstance(self.provenance, DecisionProvenance):
            provenance = self.provenance.to_dict()
        else:
            provenance = self.provenance

        settlement_label: None | str | Unset
        if isinstance(self.settlement_label, Unset):
            settlement_label = UNSET
        else:
            settlement_label = self.settlement_label

        settled_at: None | str | Unset
        if isinstance(self.settled_at, Unset):
            settled_at = UNSET
        elif isinstance(self.settled_at, datetime.datetime):
            settled_at = self.settled_at.isoformat()
        else:
            settled_at = self.settled_at

        created_at: str | Unset = UNSET
        if not isinstance(self.created_at, Unset):
            created_at = self.created_at.isoformat()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if decision_uuid is not UNSET:
            field_dict["decisionUuid"] = decision_uuid
        if schema_version is not UNSET:
            field_dict["schemaVersion"] = schema_version
        if content_hash is not UNSET:
            field_dict["contentHash"] = content_hash
        if content_hash_fields is not UNSET:
            field_dict["contentHashFields"] = content_hash_fields
        if opportunity_kind is not UNSET:
            field_dict["opportunityKind"] = opportunity_kind
        if reason_code is not UNSET:
            field_dict["reasonCode"] = reason_code
        if result is not UNSET:
            field_dict["result"] = result
        if evaluation_policy_version is not UNSET:
            field_dict["evaluationPolicyVersion"] = evaluation_policy_version
        if execution_policy_version is not UNSET:
            field_dict["executionPolicyVersion"] = execution_policy_version
        if api_key_id is not UNSET:
            field_dict["apiKeyId"] = api_key_id
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
        if run_id is not UNSET:
            field_dict["runId"] = run_id
        if decision_id is not UNSET:
            field_dict["decisionId"] = decision_id
        if decision_context is not UNSET:
            field_dict["decisionContext"] = decision_context
        if provenance is not UNSET:
            field_dict["provenance"] = provenance
        if settlement_label is not UNSET:
            field_dict["settlementLabel"] = settlement_label
        if settled_at is not UNSET:
            field_dict["settledAt"] = settled_at
        if created_at is not UNSET:
            field_dict["createdAt"] = created_at

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.decision_provenance import DecisionProvenance
        from ..models.entry_context import EntryContext
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


        def _parse_content_hash(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        content_hash = _parse_content_hash(d.pop("contentHash", UNSET))


        content_hash_fields = cast(list[str], d.pop("contentHashFields", UNSET))


        _opportunity_kind = d.pop("opportunityKind", UNSET)
        opportunity_kind: AgentDecisionArtifactOpportunityKind | Unset
        if isinstance(_opportunity_kind,  Unset):
            opportunity_kind = UNSET
        else:
            opportunity_kind = AgentDecisionArtifactOpportunityKind(_opportunity_kind)




        def _parse_reason_code(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        reason_code = _parse_reason_code(d.pop("reasonCode", UNSET))


        result = d.pop("result", UNSET)

        evaluation_policy_version = d.pop("evaluationPolicyVersion", UNSET)

        execution_policy_version = d.pop("executionPolicyVersion", UNSET)

        def _parse_api_key_id(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        api_key_id = _parse_api_key_id(d.pop("apiKeyId", UNSET))


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


        def _parse_run_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        run_id = _parse_run_id(d.pop("runId", UNSET))


        def _parse_decision_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        decision_id = _parse_decision_id(d.pop("decisionId", UNSET))


        def _parse_decision_context(data: object) -> EntryContext | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                decision_context_type_0 = EntryContext.from_dict(data)



                return decision_context_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(EntryContext | None | Unset, data)

        decision_context = _parse_decision_context(d.pop("decisionContext", UNSET))


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


        def _parse_settlement_label(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        settlement_label = _parse_settlement_label(d.pop("settlementLabel", UNSET))


        def _parse_settled_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                settled_at_type_0 = isoparse(data)



                return settled_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        settled_at = _parse_settled_at(d.pop("settledAt", UNSET))


        _created_at = d.pop("createdAt", UNSET)
        created_at: datetime.datetime | Unset
        if isinstance(_created_at,  Unset):
            created_at = UNSET
        else:
            created_at = isoparse(_created_at)




        agent_decision_artifact = cls(
            decision_uuid=decision_uuid,
            schema_version=schema_version,
            content_hash=content_hash,
            content_hash_fields=content_hash_fields,
            opportunity_kind=opportunity_kind,
            reason_code=reason_code,
            result=result,
            evaluation_policy_version=evaluation_policy_version,
            execution_policy_version=execution_policy_version,
            api_key_id=api_key_id,
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
            run_id=run_id,
            decision_id=decision_id,
            decision_context=decision_context,
            provenance=provenance,
            settlement_label=settlement_label,
            settled_at=settled_at,
            created_at=created_at,
        )


        agent_decision_artifact.additional_properties = d
        return agent_decision_artifact

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
