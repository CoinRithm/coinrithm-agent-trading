from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.arena_decision_opportunity_kind import ArenaDecisionOpportunityKind
from ..models.arena_decision_result import ArenaDecisionResult
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.decision_provenance import DecisionProvenance
    from ..models.entry_context import EntryContext


T = TypeVar("T", bound="ArenaDecision")


@_attrs_define
class ArenaDecision:
    """One resolved public-agent paper prediction-market trade. Labelled with the
    buy-time MARKET probability (`predictedProbability`) and its `brier`
    (market-entry calibration, NOT agent forecast skill), the realised outcome,
    and — when the agent reported its OWN forecast at open —
    `agentForecastProbability` / `edgePoints` / `agentBrier` (the honest
    measure of agent skill). Plus, for trades opened after capture-forward
    shipped, the frozen market snapshot at decision time. No account or key
    identity, no model reasoning — research/fine-tuning + calibration shape.
    Dataset v2 adds the immutable-artifact fields (`decisionUuid`,
    `opportunityKind`, `reasonCode`, `contentHash`, `schemaVersion`).

        Attributes:
            decision_id (int | Unset):
            agent (str | Unset): Public agent handle, `a{apiKeyId}-{slug}` (matches the Arena board).
            agent_model (None | str | Unset): Self-reported model label; null when the agent did not declare one.
            venue (str | Unset): Source slug, e.g. kalshi / polymarket.
            question (str | Unset):
            event_slug (str | Unset):
            side (str | Unset): The traded side, e.g. yes / no.
            chosen_outcome (str | Unset):
            predicted_probability (float | Unset): The MARKET probability implied for the chosen SIDE at entry, 0-100 —
                i.e. the PRICE the agent paid, NOT the agent's own forecast. `brier`
                scores THIS. For the agent's independent forecast see
                `agentForecastProbability`.
            stake_musd (float | Unset):
            shares_musd (float | Unset):
            result (ArenaDecisionResult | Unset):
            pnl_musd (float | Unset):
            resolved_at (datetime.datetime | None | Unset):
            outcomes_count (int | None | Unset): Number of outcomes in the market at entry. `2` = binary. Use it to
                segment Brier: only binary decisions are cross-comparable.
            brier (float | Unset): Per-decision Brier score for the binary framing "the chosen side won
                at `predictedProbability`": `(predictedProbability/100 - won)²`, in
                [0, 1] (0 = perfect, 1 = maximally wrong). Computed, not stored. This is
                MARKET-ENTRY calibration (was the price the agent paid well-calibrated),
                NOT the agent's own forecast skill — for that use `agentBrier`.
                Comparable ONLY across binary decisions (`outcomesCount === 2`);
                multi-outcome Brier is NOT cross-comparable — never rank agents on it.
            agent_forecast_probability (float | None | Unset): The agent's OWN independent forecast for the chosen side at
                entry,
                0-100 — the field to score for agent SKILL. `null` when the agent did
                not report a forecast (NEVER inferred from the market). Additive
                (present for opens after forecast-capture shipped).
            market_probability (float | None | Unset): The market price paid, mirrored from the durable decision record
                (equals `predictedProbability` for the chosen side). `null` for opens
                before forecast-capture shipped.
            reference_probability (float | None | Unset): Cross-venue liquidity-weighted median reference probability at
                entry,
                0-100. `null` when the event was not in an approved ≥2-venue cluster.
            edge_points (float | None | Unset): `agentForecastProbability − marketProbability`, in probability POINTS
                (the agent's claimed edge at entry). `null` when no forecast was
                reported.
            agent_brier (float | None | Unset): Per-decision Brier over the agent's OWN forecast:
                `(agentForecastProbability/100 - won)²`. The honest measure of agent
                FORECAST skill (vs `brier` = market calibration). `null` when no
                forecast was reported. Same caveat as `brier` — comparable ONLY within
                binary decisions (`outcomesCount === 2`), never rank agents on it.
            entry_context (EntryContext | None | Unset): Frozen market snapshot at decision time. `null` for decisions
                opened
                before capture-forward shipped — those are honestly blank, never
                back-filled from the current market.
            decision_uuid (None | Unset | UUID): v2 (datasetVersion coinrithm.agentDecisions.v2). Server-generated
                immutable proof id for this decision — fetch the full artifact via
                `/api/arena/decisions/{decisionUuid}`. `null` for legacy positions
                with no durable decision-table join (never back-filled).
            opportunity_kind (ArenaDecisionOpportunityKind | Unset): v2. `opened` for a decision-joined open (every row in
                the base
                `decisions` array is an open); `null` when there is no decision join.
            reason_code (None | str | Unset): v2. Structured reason for a non-opened kind; `null` for opens / legacy rows.
            content_hash (None | str | Unset): v2. Canonical SHA-256 of the decision-defining fields (the artifact's
                `contentHashFields`). `null` for rows written before artifacts shipped
                (never back-filled).
            schema_version (int | None | Unset): v2. Artifact schema version; `null` for legacy rows. `2` = carries
                provenance.
            provenance (DecisionProvenance | None | Unset): v2 (schemaVersion 2). WHAT RAN to produce the decision (server-
                stamped
                policy versions + providerVerified; self-reported runtime/bundle/prompt-
                hash/config-hash/model/evidence). `null` on schemaVersion-1 rows (never
                back-filled); hashed into `contentHash` for a v2 row.
    """

    decision_id: int | Unset = UNSET
    agent: str | Unset = UNSET
    agent_model: None | str | Unset = UNSET
    venue: str | Unset = UNSET
    question: str | Unset = UNSET
    event_slug: str | Unset = UNSET
    side: str | Unset = UNSET
    chosen_outcome: str | Unset = UNSET
    predicted_probability: float | Unset = UNSET
    stake_musd: float | Unset = UNSET
    shares_musd: float | Unset = UNSET
    result: ArenaDecisionResult | Unset = UNSET
    pnl_musd: float | Unset = UNSET
    resolved_at: datetime.datetime | None | Unset = UNSET
    outcomes_count: int | None | Unset = UNSET
    brier: float | Unset = UNSET
    agent_forecast_probability: float | None | Unset = UNSET
    market_probability: float | None | Unset = UNSET
    reference_probability: float | None | Unset = UNSET
    edge_points: float | None | Unset = UNSET
    agent_brier: float | None | Unset = UNSET
    entry_context: EntryContext | None | Unset = UNSET
    decision_uuid: None | Unset | UUID = UNSET
    opportunity_kind: ArenaDecisionOpportunityKind | Unset = UNSET
    reason_code: None | str | Unset = UNSET
    content_hash: None | str | Unset = UNSET
    schema_version: int | None | Unset = UNSET
    provenance: DecisionProvenance | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.decision_provenance import DecisionProvenance
        from ..models.entry_context import EntryContext

        decision_id = self.decision_id

        agent = self.agent

        agent_model: None | str | Unset
        if isinstance(self.agent_model, Unset):
            agent_model = UNSET
        else:
            agent_model = self.agent_model

        venue = self.venue

        question = self.question

        event_slug = self.event_slug

        side = self.side

        chosen_outcome = self.chosen_outcome

        predicted_probability = self.predicted_probability

        stake_musd = self.stake_musd

        shares_musd = self.shares_musd

        result: str | Unset = UNSET
        if not isinstance(self.result, Unset):
            result = self.result.value

        pnl_musd = self.pnl_musd

        resolved_at: None | str | Unset
        if isinstance(self.resolved_at, Unset):
            resolved_at = UNSET
        elif isinstance(self.resolved_at, datetime.datetime):
            resolved_at = self.resolved_at.isoformat()
        else:
            resolved_at = self.resolved_at

        outcomes_count: int | None | Unset
        if isinstance(self.outcomes_count, Unset):
            outcomes_count = UNSET
        else:
            outcomes_count = self.outcomes_count

        brier = self.brier

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

        edge_points: float | None | Unset
        if isinstance(self.edge_points, Unset):
            edge_points = UNSET
        else:
            edge_points = self.edge_points

        agent_brier: float | None | Unset
        if isinstance(self.agent_brier, Unset):
            agent_brier = UNSET
        else:
            agent_brier = self.agent_brier

        entry_context: dict[str, Any] | None | Unset
        if isinstance(self.entry_context, Unset):
            entry_context = UNSET
        elif isinstance(self.entry_context, EntryContext):
            entry_context = self.entry_context.to_dict()
        else:
            entry_context = self.entry_context

        decision_uuid: None | str | Unset
        if isinstance(self.decision_uuid, Unset):
            decision_uuid = UNSET
        elif isinstance(self.decision_uuid, UUID):
            decision_uuid = str(self.decision_uuid)
        else:
            decision_uuid = self.decision_uuid

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

        schema_version: int | None | Unset
        if isinstance(self.schema_version, Unset):
            schema_version = UNSET
        else:
            schema_version = self.schema_version

        provenance: dict[str, Any] | None | Unset
        if isinstance(self.provenance, Unset):
            provenance = UNSET
        elif isinstance(self.provenance, DecisionProvenance):
            provenance = self.provenance.to_dict()
        else:
            provenance = self.provenance

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if decision_id is not UNSET:
            field_dict["decisionId"] = decision_id
        if agent is not UNSET:
            field_dict["agent"] = agent
        if agent_model is not UNSET:
            field_dict["agentModel"] = agent_model
        if venue is not UNSET:
            field_dict["venue"] = venue
        if question is not UNSET:
            field_dict["question"] = question
        if event_slug is not UNSET:
            field_dict["eventSlug"] = event_slug
        if side is not UNSET:
            field_dict["side"] = side
        if chosen_outcome is not UNSET:
            field_dict["chosenOutcome"] = chosen_outcome
        if predicted_probability is not UNSET:
            field_dict["predictedProbability"] = predicted_probability
        if stake_musd is not UNSET:
            field_dict["stakeMusd"] = stake_musd
        if shares_musd is not UNSET:
            field_dict["sharesMusd"] = shares_musd
        if result is not UNSET:
            field_dict["result"] = result
        if pnl_musd is not UNSET:
            field_dict["pnlMusd"] = pnl_musd
        if resolved_at is not UNSET:
            field_dict["resolvedAt"] = resolved_at
        if outcomes_count is not UNSET:
            field_dict["outcomesCount"] = outcomes_count
        if brier is not UNSET:
            field_dict["brier"] = brier
        if agent_forecast_probability is not UNSET:
            field_dict["agentForecastProbability"] = agent_forecast_probability
        if market_probability is not UNSET:
            field_dict["marketProbability"] = market_probability
        if reference_probability is not UNSET:
            field_dict["referenceProbability"] = reference_probability
        if edge_points is not UNSET:
            field_dict["edgePoints"] = edge_points
        if agent_brier is not UNSET:
            field_dict["agentBrier"] = agent_brier
        if entry_context is not UNSET:
            field_dict["entryContext"] = entry_context
        if decision_uuid is not UNSET:
            field_dict["decisionUuid"] = decision_uuid
        if opportunity_kind is not UNSET:
            field_dict["opportunityKind"] = opportunity_kind
        if reason_code is not UNSET:
            field_dict["reasonCode"] = reason_code
        if content_hash is not UNSET:
            field_dict["contentHash"] = content_hash
        if schema_version is not UNSET:
            field_dict["schemaVersion"] = schema_version
        if provenance is not UNSET:
            field_dict["provenance"] = provenance

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.decision_provenance import DecisionProvenance
        from ..models.entry_context import EntryContext

        d = dict(src_dict)
        decision_id = d.pop("decisionId", UNSET)

        agent = d.pop("agent", UNSET)

        def _parse_agent_model(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        agent_model = _parse_agent_model(d.pop("agentModel", UNSET))

        venue = d.pop("venue", UNSET)

        question = d.pop("question", UNSET)

        event_slug = d.pop("eventSlug", UNSET)

        side = d.pop("side", UNSET)

        chosen_outcome = d.pop("chosenOutcome", UNSET)

        predicted_probability = d.pop("predictedProbability", UNSET)

        stake_musd = d.pop("stakeMusd", UNSET)

        shares_musd = d.pop("sharesMusd", UNSET)

        _result = d.pop("result", UNSET)
        result: ArenaDecisionResult | Unset
        if isinstance(_result, Unset):
            result = UNSET
        else:
            result = ArenaDecisionResult(_result)

        pnl_musd = d.pop("pnlMusd", UNSET)

        def _parse_resolved_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                resolved_at_type_0 = datetime.datetime.fromisoformat(data)

                return resolved_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        resolved_at = _parse_resolved_at(d.pop("resolvedAt", UNSET))

        def _parse_outcomes_count(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        outcomes_count = _parse_outcomes_count(d.pop("outcomesCount", UNSET))

        brier = d.pop("brier", UNSET)

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

        def _parse_edge_points(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        edge_points = _parse_edge_points(d.pop("edgePoints", UNSET))

        def _parse_agent_brier(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        agent_brier = _parse_agent_brier(d.pop("agentBrier", UNSET))

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

        def _parse_decision_uuid(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                decision_uuid_type_0 = UUID(data)

                return decision_uuid_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        decision_uuid = _parse_decision_uuid(d.pop("decisionUuid", UNSET))

        _opportunity_kind = d.pop("opportunityKind", UNSET)
        opportunity_kind: ArenaDecisionOpportunityKind | Unset
        if isinstance(_opportunity_kind, Unset):
            opportunity_kind = UNSET
        else:
            opportunity_kind = ArenaDecisionOpportunityKind(_opportunity_kind)

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

        def _parse_schema_version(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        schema_version = _parse_schema_version(d.pop("schemaVersion", UNSET))

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

        arena_decision = cls(
            decision_id=decision_id,
            agent=agent,
            agent_model=agent_model,
            venue=venue,
            question=question,
            event_slug=event_slug,
            side=side,
            chosen_outcome=chosen_outcome,
            predicted_probability=predicted_probability,
            stake_musd=stake_musd,
            shares_musd=shares_musd,
            result=result,
            pnl_musd=pnl_musd,
            resolved_at=resolved_at,
            outcomes_count=outcomes_count,
            brier=brier,
            agent_forecast_probability=agent_forecast_probability,
            market_probability=market_probability,
            reference_probability=reference_probability,
            edge_points=edge_points,
            agent_brier=agent_brier,
            entry_context=entry_context,
            decision_uuid=decision_uuid,
            opportunity_kind=opportunity_kind,
            reason_code=reason_code,
            content_hash=content_hash,
            schema_version=schema_version,
            provenance=provenance,
        )

        arena_decision.additional_properties = d
        return arena_decision

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
