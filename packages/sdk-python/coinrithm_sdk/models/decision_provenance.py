from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.decision_provenance_runtime_kind_type_1 import DecisionProvenanceRuntimeKindType1
from ..models.decision_provenance_runtime_kind_type_2_type_1 import DecisionProvenanceRuntimeKindType2Type1
from ..models.decision_provenance_runtime_kind_type_3_type_1 import DecisionProvenanceRuntimeKindType3Type1
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.decision_provenance_evidence_ref_type_0 import DecisionProvenanceEvidenceRefType0
    from ..models.decision_provenance_skill_versions_type_0 import DecisionProvenanceSkillVersionsType0


T = TypeVar("T", bound="DecisionProvenance")


@_attrs_define
class DecisionProvenance:
    """Provenance-v2 as STORED and SERVED on a schemaVersion-2 artifact: WHAT RAN to
    produce the decision. The HONESTY SPLIT is load-bearing — server-stamped
    fields are authoritative; caller-reported fields are SELF-REPORTED and carry
    no trust. Present only on schemaVersion-2 rows (null / absent on v1).

        Attributes:
            v (int | Unset): Provenance object version.
            execution_policy_version (str | Unset): SERVER-STAMPED. Versioned paper-execution policy (e.g.
                paper_execution_v1).
            evaluation_policy_version (str | Unset): SERVER-STAMPED. Versioned evaluation policy (e.g. eval-1).
            provider_verified (bool | Unset): SERVER-COMPUTED ONLY — true only where CoinRithm itself controlled the
                model/provider call. Currently FALSE for every public agent surface (the
                house scheduler and self-host runner both authenticate as ordinary keyed
                callers, so there is no non-spoofable signal); a caller can NEVER raise
                it. Honest, not aspirational.
            runtime_kind (DecisionProvenanceRuntimeKindType1 | DecisionProvenanceRuntimeKindType2Type1 |
                DecisionProvenanceRuntimeKindType3Type1 | None | Unset): SELF-REPORTED runtime surface. No trust on its own.
            package_version (None | str | Unset):
            bundle_id (None | str | Unset):
            bundle_version (None | str | Unset):
            skill_versions (DecisionProvenanceSkillVersionsType0 | None | Unset): SELF-REPORTED {skillId: version}.
            prompt_hash (None | str | Unset): sha256 hex (64) of the prompt strings — HASH ONLY, never raw text.
            config_hash (None | str | Unset): sha256 hex (64) of the resolved config — HASH ONLY, never raw text.
            model_provider (None | str | Unset):
            model_name (None | str | Unset):
            evidence_ref (DecisionProvenanceEvidenceRefType0 | None | Unset): Pointers to the observation evidence (never
                the evidence itself).
    """

    v: int | Unset = UNSET
    execution_policy_version: str | Unset = UNSET
    evaluation_policy_version: str | Unset = UNSET
    provider_verified: bool | Unset = UNSET
    runtime_kind: (
        DecisionProvenanceRuntimeKindType1
        | DecisionProvenanceRuntimeKindType2Type1
        | DecisionProvenanceRuntimeKindType3Type1
        | None
        | Unset
    ) = UNSET
    package_version: None | str | Unset = UNSET
    bundle_id: None | str | Unset = UNSET
    bundle_version: None | str | Unset = UNSET
    skill_versions: DecisionProvenanceSkillVersionsType0 | None | Unset = UNSET
    prompt_hash: None | str | Unset = UNSET
    config_hash: None | str | Unset = UNSET
    model_provider: None | str | Unset = UNSET
    model_name: None | str | Unset = UNSET
    evidence_ref: DecisionProvenanceEvidenceRefType0 | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.decision_provenance_evidence_ref_type_0 import DecisionProvenanceEvidenceRefType0
        from ..models.decision_provenance_skill_versions_type_0 import DecisionProvenanceSkillVersionsType0

        v = self.v

        execution_policy_version = self.execution_policy_version

        evaluation_policy_version = self.evaluation_policy_version

        provider_verified = self.provider_verified

        runtime_kind: None | str | Unset
        if isinstance(self.runtime_kind, Unset):
            runtime_kind = UNSET
        elif isinstance(self.runtime_kind, DecisionProvenanceRuntimeKindType1):
            runtime_kind = self.runtime_kind.value
        elif isinstance(self.runtime_kind, DecisionProvenanceRuntimeKindType2Type1):
            runtime_kind = self.runtime_kind.value
        elif isinstance(self.runtime_kind, DecisionProvenanceRuntimeKindType3Type1):
            runtime_kind = self.runtime_kind.value
        else:
            runtime_kind = self.runtime_kind

        package_version: None | str | Unset
        if isinstance(self.package_version, Unset):
            package_version = UNSET
        else:
            package_version = self.package_version

        bundle_id: None | str | Unset
        if isinstance(self.bundle_id, Unset):
            bundle_id = UNSET
        else:
            bundle_id = self.bundle_id

        bundle_version: None | str | Unset
        if isinstance(self.bundle_version, Unset):
            bundle_version = UNSET
        else:
            bundle_version = self.bundle_version

        skill_versions: dict[str, Any] | None | Unset
        if isinstance(self.skill_versions, Unset):
            skill_versions = UNSET
        elif isinstance(self.skill_versions, DecisionProvenanceSkillVersionsType0):
            skill_versions = self.skill_versions.to_dict()
        else:
            skill_versions = self.skill_versions

        prompt_hash: None | str | Unset
        if isinstance(self.prompt_hash, Unset):
            prompt_hash = UNSET
        else:
            prompt_hash = self.prompt_hash

        config_hash: None | str | Unset
        if isinstance(self.config_hash, Unset):
            config_hash = UNSET
        else:
            config_hash = self.config_hash

        model_provider: None | str | Unset
        if isinstance(self.model_provider, Unset):
            model_provider = UNSET
        else:
            model_provider = self.model_provider

        model_name: None | str | Unset
        if isinstance(self.model_name, Unset):
            model_name = UNSET
        else:
            model_name = self.model_name

        evidence_ref: dict[str, Any] | None | Unset
        if isinstance(self.evidence_ref, Unset):
            evidence_ref = UNSET
        elif isinstance(self.evidence_ref, DecisionProvenanceEvidenceRefType0):
            evidence_ref = self.evidence_ref.to_dict()
        else:
            evidence_ref = self.evidence_ref

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if v is not UNSET:
            field_dict["v"] = v
        if execution_policy_version is not UNSET:
            field_dict["executionPolicyVersion"] = execution_policy_version
        if evaluation_policy_version is not UNSET:
            field_dict["evaluationPolicyVersion"] = evaluation_policy_version
        if provider_verified is not UNSET:
            field_dict["providerVerified"] = provider_verified
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
        from ..models.decision_provenance_evidence_ref_type_0 import DecisionProvenanceEvidenceRefType0
        from ..models.decision_provenance_skill_versions_type_0 import DecisionProvenanceSkillVersionsType0

        d = dict(src_dict)
        v = d.pop("v", UNSET)

        execution_policy_version = d.pop("executionPolicyVersion", UNSET)

        evaluation_policy_version = d.pop("evaluationPolicyVersion", UNSET)

        provider_verified = d.pop("providerVerified", UNSET)

        def _parse_runtime_kind(
            data: object,
        ) -> (
            DecisionProvenanceRuntimeKindType1
            | DecisionProvenanceRuntimeKindType2Type1
            | DecisionProvenanceRuntimeKindType3Type1
            | None
            | Unset
        ):
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                runtime_kind_type_1 = DecisionProvenanceRuntimeKindType1(data)

                return runtime_kind_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                runtime_kind_type_2_type_1 = DecisionProvenanceRuntimeKindType2Type1(data)

                return runtime_kind_type_2_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                runtime_kind_type_3_type_1 = DecisionProvenanceRuntimeKindType3Type1(data)

                return runtime_kind_type_3_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(
                DecisionProvenanceRuntimeKindType1
                | DecisionProvenanceRuntimeKindType2Type1
                | DecisionProvenanceRuntimeKindType3Type1
                | None
                | Unset,
                data,
            )

        runtime_kind = _parse_runtime_kind(d.pop("runtimeKind", UNSET))

        def _parse_package_version(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        package_version = _parse_package_version(d.pop("packageVersion", UNSET))

        def _parse_bundle_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        bundle_id = _parse_bundle_id(d.pop("bundleId", UNSET))

        def _parse_bundle_version(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        bundle_version = _parse_bundle_version(d.pop("bundleVersion", UNSET))

        def _parse_skill_versions(data: object) -> DecisionProvenanceSkillVersionsType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                skill_versions_type_0 = DecisionProvenanceSkillVersionsType0.from_dict(data)

                return skill_versions_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(DecisionProvenanceSkillVersionsType0 | None | Unset, data)

        skill_versions = _parse_skill_versions(d.pop("skillVersions", UNSET))

        def _parse_prompt_hash(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        prompt_hash = _parse_prompt_hash(d.pop("promptHash", UNSET))

        def _parse_config_hash(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        config_hash = _parse_config_hash(d.pop("configHash", UNSET))

        def _parse_model_provider(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        model_provider = _parse_model_provider(d.pop("modelProvider", UNSET))

        def _parse_model_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        model_name = _parse_model_name(d.pop("modelName", UNSET))

        def _parse_evidence_ref(data: object) -> DecisionProvenanceEvidenceRefType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                evidence_ref_type_0 = DecisionProvenanceEvidenceRefType0.from_dict(data)

                return evidence_ref_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(DecisionProvenanceEvidenceRefType0 | None | Unset, data)

        evidence_ref = _parse_evidence_ref(d.pop("evidenceRef", UNSET))

        decision_provenance = cls(
            v=v,
            execution_policy_version=execution_policy_version,
            evaluation_policy_version=evaluation_policy_version,
            provider_verified=provider_verified,
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

        decision_provenance.additional_properties = d
        return decision_provenance

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
