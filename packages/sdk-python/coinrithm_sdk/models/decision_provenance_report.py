from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.decision_provenance_report_runtime_kind import DecisionProvenanceReportRuntimeKind
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.decision_provenance_report_evidence_ref import DecisionProvenanceReportEvidenceRef
  from ..models.decision_provenance_report_skill_versions import DecisionProvenanceReportSkillVersions





T = TypeVar("T", bound="DecisionProvenanceReport")



@_attrs_define
class DecisionProvenanceReport:
    """ OPTIONAL self-reported provenance you attach to a pm/open or pm/opportunity
    so the durable artifact can record WHAT RAN to produce the decision. Every
    field here is SELF-REPORTED and carries NO trust on its own. Sending ANY
    provenance block (even `{}`) makes the resulting artifact schemaVersion 2 and
    binds provenance into its `contentHash`. The server ALWAYS stamps
    `executionPolicyVersion`, `evaluationPolicyVersion` and `providerVerified`
    itself — if you send those keys they are IGNORED (`providerVerified` can NEVER
    be raised by a caller). `promptHash` / `configHash` must be sha256 hex (64
    chars): send HASHES, never raw prompt or config text (a non-hex value is
    dropped). Unknown keys are ignored; oversized values are capped.

        Attributes:
            runtime_kind (DecisionProvenanceReportRuntimeKind | Unset): The runtime surface you ran on (self-reported; no
                trust).
            package_version (str | Unset):
            bundle_id (str | Unset):
            bundle_version (str | Unset):
            skill_versions (DecisionProvenanceReportSkillVersions | Unset): {skillId: version}. Capped: 50 keys, key<=120 /
                value<=40 chars.
            prompt_hash (str | Unset): sha256 hex of your exact prompt strings. HASH ONLY — never raw text.
            config_hash (str | Unset): sha256 hex of your resolved config/spec. HASH ONLY — never raw text.
            model_provider (str | Unset):
            model_name (str | Unset):
            evidence_ref (DecisionProvenanceReportEvidenceRef | Unset): Pointers to the observation evidence (never the
                evidence itself).
     """

    runtime_kind: DecisionProvenanceReportRuntimeKind | Unset = UNSET
    package_version: str | Unset = UNSET
    bundle_id: str | Unset = UNSET
    bundle_version: str | Unset = UNSET
    skill_versions: DecisionProvenanceReportSkillVersions | Unset = UNSET
    prompt_hash: str | Unset = UNSET
    config_hash: str | Unset = UNSET
    model_provider: str | Unset = UNSET
    model_name: str | Unset = UNSET
    evidence_ref: DecisionProvenanceReportEvidenceRef | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.decision_provenance_report_evidence_ref import DecisionProvenanceReportEvidenceRef
        from ..models.decision_provenance_report_skill_versions import DecisionProvenanceReportSkillVersions
        runtime_kind: str | Unset = UNSET
        if not isinstance(self.runtime_kind, Unset):
            runtime_kind = self.runtime_kind.value


        package_version = self.package_version

        bundle_id = self.bundle_id

        bundle_version = self.bundle_version

        skill_versions: dict[str, Any] | Unset = UNSET
        if not isinstance(self.skill_versions, Unset):
            skill_versions = self.skill_versions.to_dict()

        prompt_hash = self.prompt_hash

        config_hash = self.config_hash

        model_provider = self.model_provider

        model_name = self.model_name

        evidence_ref: dict[str, Any] | Unset = UNSET
        if not isinstance(self.evidence_ref, Unset):
            evidence_ref = self.evidence_ref.to_dict()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if runtime_kind is not UNSET:
            field_dict["runtimeKind"] = runtime_kind
        if package_version is not UNSET:
            field_dict["packageVersion"] = package_version
        if bundle_id is not UNSET:
            field_dict["bundleId"] = bundle_id
        if bundle_version is not UNSET:
            field_dict["bundleVersion"] = bundle_version
        if skill_versions is not UNSET:
            field_dict["skillVersions"] = skill_versions
        if prompt_hash is not UNSET:
            field_dict["promptHash"] = prompt_hash
        if config_hash is not UNSET:
            field_dict["configHash"] = config_hash
        if model_provider is not UNSET:
            field_dict["modelProvider"] = model_provider
        if model_name is not UNSET:
            field_dict["modelName"] = model_name
        if evidence_ref is not UNSET:
            field_dict["evidenceRef"] = evidence_ref

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.decision_provenance_report_evidence_ref import DecisionProvenanceReportEvidenceRef
        from ..models.decision_provenance_report_skill_versions import DecisionProvenanceReportSkillVersions
        d = dict(src_dict)
        _runtime_kind = d.pop("runtimeKind", UNSET)
        runtime_kind: DecisionProvenanceReportRuntimeKind | Unset
        if isinstance(_runtime_kind,  Unset):
            runtime_kind = UNSET
        else:
            runtime_kind = DecisionProvenanceReportRuntimeKind(_runtime_kind)




        package_version = d.pop("packageVersion", UNSET)

        bundle_id = d.pop("bundleId", UNSET)

        bundle_version = d.pop("bundleVersion", UNSET)

        _skill_versions = d.pop("skillVersions", UNSET)
        skill_versions: DecisionProvenanceReportSkillVersions | Unset
        if isinstance(_skill_versions,  Unset):
            skill_versions = UNSET
        else:
            skill_versions = DecisionProvenanceReportSkillVersions.from_dict(_skill_versions)




        prompt_hash = d.pop("promptHash", UNSET)

        config_hash = d.pop("configHash", UNSET)

        model_provider = d.pop("modelProvider", UNSET)

        model_name = d.pop("modelName", UNSET)

        _evidence_ref = d.pop("evidenceRef", UNSET)
        evidence_ref: DecisionProvenanceReportEvidenceRef | Unset
        if isinstance(_evidence_ref,  Unset):
            evidence_ref = UNSET
        else:
            evidence_ref = DecisionProvenanceReportEvidenceRef.from_dict(_evidence_ref)




        decision_provenance_report = cls(
            runtime_kind=runtime_kind,
            package_version=package_version,
            bundle_id=bundle_id,
            bundle_version=bundle_version,
            skill_versions=skill_versions,
            prompt_hash=prompt_hash,
            config_hash=config_hash,
            model_provider=model_provider,
            model_name=model_name,
            evidence_ref=evidence_ref,
        )


        decision_provenance_report.additional_properties = d
        return decision_provenance_report

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
