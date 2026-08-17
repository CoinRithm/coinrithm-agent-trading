from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_execution_assumptions import AgentExecutionAssumptions
    from ..models.agent_ledger_retention_policy import AgentLedgerRetentionPolicy
    from ..models.agent_run_evidence_checklist import AgentRunEvidenceChecklist
    from ..models.agent_run_evidence_manifest_summary import AgentRunEvidenceManifestSummary
    from ..models.agent_run_outcome_summary import AgentRunOutcomeSummary


T = TypeVar("T", bound="AgentRunEvidenceManifest")


@_attrs_define
class AgentRunEvidenceManifest:
    """Private reproducibility bundle metadata for one agentTrace.runId.

    Attributes:
        schema (str | Unset):
        generated_at (datetime.datetime | Unset):
        source (str | Unset):
        definition (str | Unset):
        snapshot_model (str | Unset):
        retention_policy (AgentLedgerRetentionPolicy | Unset): Bounded retention/cap policy for private agent ledger
            evidence.
        execution_assumptions (AgentExecutionAssumptions | Unset): Versioned paper-execution assumptions attached to
            private run exports.
            This is methodology metadata, not a fee/slippage charge schedule.
        outcome_summary (AgentRunOutcomeSummary | None | Unset):
        evidence_checklist (AgentRunEvidenceChecklist | Unset): Derived private reproducibility checklist for a run
            export. Computed
            from ledger rows at read/export time; no additional run table or raw
            market archive is created.
        summary (AgentRunEvidenceManifestSummary | Unset):
    """

    schema: str | Unset = UNSET
    generated_at: datetime.datetime | Unset = UNSET
    source: str | Unset = UNSET
    definition: str | Unset = UNSET
    snapshot_model: str | Unset = UNSET
    retention_policy: AgentLedgerRetentionPolicy | Unset = UNSET
    execution_assumptions: AgentExecutionAssumptions | Unset = UNSET
    outcome_summary: AgentRunOutcomeSummary | None | Unset = UNSET
    evidence_checklist: AgentRunEvidenceChecklist | Unset = UNSET
    summary: AgentRunEvidenceManifestSummary | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.agent_run_outcome_summary import AgentRunOutcomeSummary

        schema = self.schema

        generated_at: str | Unset = UNSET
        if not isinstance(self.generated_at, Unset):
            generated_at = self.generated_at.isoformat()

        source = self.source

        definition = self.definition

        snapshot_model = self.snapshot_model

        retention_policy: dict[str, Any] | Unset = UNSET
        if not isinstance(self.retention_policy, Unset):
            retention_policy = self.retention_policy.to_dict()

        execution_assumptions: dict[str, Any] | Unset = UNSET
        if not isinstance(self.execution_assumptions, Unset):
            execution_assumptions = self.execution_assumptions.to_dict()

        outcome_summary: dict[str, Any] | None | Unset
        if isinstance(self.outcome_summary, Unset):
            outcome_summary = UNSET
        elif isinstance(self.outcome_summary, AgentRunOutcomeSummary):
            outcome_summary = self.outcome_summary.to_dict()
        else:
            outcome_summary = self.outcome_summary

        evidence_checklist: dict[str, Any] | Unset = UNSET
        if not isinstance(self.evidence_checklist, Unset):
            evidence_checklist = self.evidence_checklist.to_dict()

        summary: dict[str, Any] | Unset = UNSET
        if not isinstance(self.summary, Unset):
            summary = self.summary.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if schema is not UNSET:
            field_dict["schema"] = schema
        if generated_at is not UNSET:
            field_dict["generatedAt"] = generated_at
        if source is not UNSET:
            field_dict["source"] = source
        if definition is not UNSET:
            field_dict["definition"] = definition
        if snapshot_model is not UNSET:
            field_dict["snapshotModel"] = snapshot_model
        if retention_policy is not UNSET:
            field_dict["retentionPolicy"] = retention_policy
        if execution_assumptions is not UNSET:
            field_dict["executionAssumptions"] = execution_assumptions
        if outcome_summary is not UNSET:
            field_dict["outcomeSummary"] = outcome_summary
        if evidence_checklist is not UNSET:
            field_dict["evidenceChecklist"] = evidence_checklist
        if summary is not UNSET:
            field_dict["summary"] = summary

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_execution_assumptions import AgentExecutionAssumptions
        from ..models.agent_ledger_retention_policy import AgentLedgerRetentionPolicy
        from ..models.agent_run_evidence_checklist import AgentRunEvidenceChecklist
        from ..models.agent_run_evidence_manifest_summary import AgentRunEvidenceManifestSummary
        from ..models.agent_run_outcome_summary import AgentRunOutcomeSummary

        d = dict(src_dict)
        schema = d.pop("schema", UNSET)

        _generated_at = d.pop("generatedAt", UNSET)
        generated_at: datetime.datetime | Unset
        if isinstance(_generated_at, Unset):
            generated_at = UNSET
        else:
            generated_at = datetime.datetime.fromisoformat(_generated_at)

        source = d.pop("source", UNSET)

        definition = d.pop("definition", UNSET)

        snapshot_model = d.pop("snapshotModel", UNSET)

        _retention_policy = d.pop("retentionPolicy", UNSET)
        retention_policy: AgentLedgerRetentionPolicy | Unset
        if isinstance(_retention_policy, Unset):
            retention_policy = UNSET
        else:
            retention_policy = AgentLedgerRetentionPolicy.from_dict(_retention_policy)

        _execution_assumptions = d.pop("executionAssumptions", UNSET)
        execution_assumptions: AgentExecutionAssumptions | Unset
        if isinstance(_execution_assumptions, Unset):
            execution_assumptions = UNSET
        else:
            execution_assumptions = AgentExecutionAssumptions.from_dict(_execution_assumptions)

        def _parse_outcome_summary(data: object) -> AgentRunOutcomeSummary | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                outcome_summary_type_0 = AgentRunOutcomeSummary.from_dict(data)

                return outcome_summary_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(AgentRunOutcomeSummary | None | Unset, data)

        outcome_summary = _parse_outcome_summary(d.pop("outcomeSummary", UNSET))

        _evidence_checklist = d.pop("evidenceChecklist", UNSET)
        evidence_checklist: AgentRunEvidenceChecklist | Unset
        if isinstance(_evidence_checklist, Unset):
            evidence_checklist = UNSET
        else:
            evidence_checklist = AgentRunEvidenceChecklist.from_dict(_evidence_checklist)

        _summary = d.pop("summary", UNSET)
        summary: AgentRunEvidenceManifestSummary | Unset
        if isinstance(_summary, Unset):
            summary = UNSET
        else:
            summary = AgentRunEvidenceManifestSummary.from_dict(_summary)

        agent_run_evidence_manifest = cls(
            schema=schema,
            generated_at=generated_at,
            source=source,
            definition=definition,
            snapshot_model=snapshot_model,
            retention_policy=retention_policy,
            execution_assumptions=execution_assumptions,
            outcome_summary=outcome_summary,
            evidence_checklist=evidence_checklist,
            summary=summary,
        )

        agent_run_evidence_manifest.additional_properties = d
        return agent_run_evidence_manifest

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
