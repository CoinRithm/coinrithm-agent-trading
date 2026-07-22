from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.pm_opportunity_request_kind import PmOpportunityRequestKind
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.agent_trace_metadata import AgentTraceMetadata
  from ..models.decision_provenance_report import DecisionProvenanceReport
  from ..models.pm_opportunity_request_cohort import PmOpportunityRequestCohort





T = TypeVar("T", bound="PmOpportunityRequest")



@_attrs_define
class PmOpportunityRequest:
    """ 
        Attributes:
            kind (PmOpportunityRequestKind): abstained = evaluated markets but did not bet; forecast_only = formed
                your OWN probability without trading (forecastProbability required);
                quote_expired = a validated open the server rejected at act time.
            source (str | Unset): Optional subject market source slug.
            slug (str | Unset): Optional subject event slug.
            outcome_external_market_id (str | Unset): Optional case-sensitive outcome/market id of the subject.
            forecast_probability (float | Unset): Your OWN probability (1-99) the chosen side wins. REQUIRED for
                forecast_only; omit for the other kinds. Never echo the market price.
            market_probability (float | Unset): The market price (0-100) you observed. Optional.
            reason_code (str | Unset): Short structured reason (e.g. no_edge, stale_data).
            cohort (PmOpportunityRequestCohort | Unset): Opportunity-cohort breadth, frozen into the artifact's
                decisionContext.
            decision_id (str | Unset): Your own decision id — idempotency key within your API key.
            run_id (str | Unset): Your own run id for grouping.
            agent_trace (AgentTraceMetadata | Unset): Optional private trace metadata supplied by a user-run agent.
                CoinRithm
                stores only this structured summary; do not send chain-of-thought,
                secrets, emails, or private account identity.
            provenance (DecisionProvenanceReport | Unset): OPTIONAL self-reported provenance you attach to a pm/open or
                pm/opportunity
                so the durable artifact can record WHAT RAN to produce the decision. Every
                field here is SELF-REPORTED and carries NO trust on its own. Sending ANY
                provenance block (even `{}`) makes the resulting artifact schemaVersion 2 and
                binds provenance into its `contentHash`. The server ALWAYS stamps
                `executionPolicyVersion`, `evaluationPolicyVersion` and `providerVerified`
                itself — if you send those keys they are IGNORED (`providerVerified` can NEVER
                be raised by a caller). `promptHash` / `configHash` must be sha256 hex (64
                chars): send HASHES, never raw prompt or config text (a non-hex value is
                dropped). Unknown keys are ignored; oversized values are capped.
     """

    kind: PmOpportunityRequestKind
    source: str | Unset = UNSET
    slug: str | Unset = UNSET
    outcome_external_market_id: str | Unset = UNSET
    forecast_probability: float | Unset = UNSET
    market_probability: float | Unset = UNSET
    reason_code: str | Unset = UNSET
    cohort: PmOpportunityRequestCohort | Unset = UNSET
    decision_id: str | Unset = UNSET
    run_id: str | Unset = UNSET
    agent_trace: AgentTraceMetadata | Unset = UNSET
    provenance: DecisionProvenanceReport | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.agent_trace_metadata import AgentTraceMetadata
        from ..models.decision_provenance_report import DecisionProvenanceReport
        from ..models.pm_opportunity_request_cohort import PmOpportunityRequestCohort
        kind = self.kind.value

        source = self.source

        slug = self.slug

        outcome_external_market_id = self.outcome_external_market_id

        forecast_probability = self.forecast_probability

        market_probability = self.market_probability

        reason_code = self.reason_code

        cohort: dict[str, Any] | Unset = UNSET
        if not isinstance(self.cohort, Unset):
            cohort = self.cohort.to_dict()

        decision_id = self.decision_id

        run_id = self.run_id

        agent_trace: dict[str, Any] | Unset = UNSET
        if not isinstance(self.agent_trace, Unset):
            agent_trace = self.agent_trace.to_dict()

        provenance: dict[str, Any] | Unset = UNSET
        if not isinstance(self.provenance, Unset):
            provenance = self.provenance.to_dict()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "kind": kind,
        })
        if source is not UNSET:
            field_dict["source"] = source
        if slug is not UNSET:
            field_dict["slug"] = slug
        if outcome_external_market_id is not UNSET:
            field_dict["outcomeExternalMarketId"] = outcome_external_market_id
        if forecast_probability is not UNSET:
            field_dict["forecastProbability"] = forecast_probability
        if market_probability is not UNSET:
            field_dict["marketProbability"] = market_probability
        if reason_code is not UNSET:
            field_dict["reasonCode"] = reason_code
        if cohort is not UNSET:
            field_dict["cohort"] = cohort
        if decision_id is not UNSET:
            field_dict["decisionId"] = decision_id
        if run_id is not UNSET:
            field_dict["runId"] = run_id
        if agent_trace is not UNSET:
            field_dict["agentTrace"] = agent_trace
        if provenance is not UNSET:
            field_dict["provenance"] = provenance

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_trace_metadata import AgentTraceMetadata
        from ..models.decision_provenance_report import DecisionProvenanceReport
        from ..models.pm_opportunity_request_cohort import PmOpportunityRequestCohort
        d = dict(src_dict)
        kind = PmOpportunityRequestKind(d.pop("kind"))




        source = d.pop("source", UNSET)

        slug = d.pop("slug", UNSET)

        outcome_external_market_id = d.pop("outcomeExternalMarketId", UNSET)

        forecast_probability = d.pop("forecastProbability", UNSET)

        market_probability = d.pop("marketProbability", UNSET)

        reason_code = d.pop("reasonCode", UNSET)

        _cohort = d.pop("cohort", UNSET)
        cohort: PmOpportunityRequestCohort | Unset
        if isinstance(_cohort,  Unset):
            cohort = UNSET
        else:
            cohort = PmOpportunityRequestCohort.from_dict(_cohort)




        decision_id = d.pop("decisionId", UNSET)

        run_id = d.pop("runId", UNSET)

        _agent_trace = d.pop("agentTrace", UNSET)
        agent_trace: AgentTraceMetadata | Unset
        if isinstance(_agent_trace,  Unset):
            agent_trace = UNSET
        else:
            agent_trace = AgentTraceMetadata.from_dict(_agent_trace)




        _provenance = d.pop("provenance", UNSET)
        provenance: DecisionProvenanceReport | Unset
        if isinstance(_provenance,  Unset):
            provenance = UNSET
        else:
            provenance = DecisionProvenanceReport.from_dict(_provenance)




        pm_opportunity_request = cls(
            kind=kind,
            source=source,
            slug=slug,
            outcome_external_market_id=outcome_external_market_id,
            forecast_probability=forecast_probability,
            market_probability=market_probability,
            reason_code=reason_code,
            cohort=cohort,
            decision_id=decision_id,
            run_id=run_id,
            agent_trace=agent_trace,
            provenance=provenance,
        )


        pm_opportunity_request.additional_properties = d
        return pm_opportunity_request

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
