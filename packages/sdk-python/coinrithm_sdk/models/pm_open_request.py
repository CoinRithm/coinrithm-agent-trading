from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_open_request_side import PmOpenRequestSide
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_trace_metadata import AgentTraceMetadata
    from ..models.decision_provenance_report import DecisionProvenanceReport


T = TypeVar("T", bound="PmOpenRequest")


@_attrs_define
class PmOpenRequest:
    """
    Attributes:
        source (str):
        slug (str):
        outcome_external_market_id (str):
        stake_musd (float):
        idempotency_key (str):
        side (PmOpenRequestSide | Unset): Side of the binary outcome to back (default yes). Default:
            PmOpenRequestSide.YES.
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

    source: str
    slug: str
    outcome_external_market_id: str
    stake_musd: float
    idempotency_key: str
    side: PmOpenRequestSide | Unset = PmOpenRequestSide.YES
    agent_trace: AgentTraceMetadata | Unset = UNSET
    provenance: DecisionProvenanceReport | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        source = self.source

        slug = self.slug

        outcome_external_market_id = self.outcome_external_market_id

        stake_musd = self.stake_musd

        idempotency_key = self.idempotency_key

        side: str | Unset = UNSET
        if not isinstance(self.side, Unset):
            side = self.side.value

        agent_trace: dict[str, Any] | Unset = UNSET
        if not isinstance(self.agent_trace, Unset):
            agent_trace = self.agent_trace.to_dict()

        provenance: dict[str, Any] | Unset = UNSET
        if not isinstance(self.provenance, Unset):
            provenance = self.provenance.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "source": source,
                "slug": slug,
                "outcomeExternalMarketId": outcome_external_market_id,
                "stakeMusd": stake_musd,
                "idempotencyKey": idempotency_key,
            }
        )
        if side is not UNSET:
            field_dict["side"] = side
        if agent_trace is not UNSET:
            field_dict["agentTrace"] = agent_trace
        if provenance is not UNSET:
            field_dict["provenance"] = provenance

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_trace_metadata import AgentTraceMetadata
        from ..models.decision_provenance_report import DecisionProvenanceReport

        d = dict(src_dict)
        source = d.pop("source")

        slug = d.pop("slug")

        outcome_external_market_id = d.pop("outcomeExternalMarketId")

        stake_musd = d.pop("stakeMusd")

        idempotency_key = d.pop("idempotencyKey")

        _side = d.pop("side", UNSET)
        side: PmOpenRequestSide | Unset
        if isinstance(_side, Unset):
            side = UNSET
        else:
            side = PmOpenRequestSide(_side)

        _agent_trace = d.pop("agentTrace", UNSET)
        agent_trace: AgentTraceMetadata | Unset
        if isinstance(_agent_trace, Unset):
            agent_trace = UNSET
        else:
            agent_trace = AgentTraceMetadata.from_dict(_agent_trace)

        _provenance = d.pop("provenance", UNSET)
        provenance: DecisionProvenanceReport | Unset
        if isinstance(_provenance, Unset):
            provenance = UNSET
        else:
            provenance = DecisionProvenanceReport.from_dict(_provenance)

        pm_open_request = cls(
            source=source,
            slug=slug,
            outcome_external_market_id=outcome_external_market_id,
            stake_musd=stake_musd,
            idempotency_key=idempotency_key,
            side=side,
            agent_trace=agent_trace,
            provenance=provenance,
        )

        pm_open_request.additional_properties = d
        return pm_open_request

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
