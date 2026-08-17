from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_event_revision_evidence import PublicPmEventRevisionEvidence


T = TypeVar("T", bound="PublicPmEventRevision")


@_attrs_define
class PublicPmEventRevision:
    """
    Attributes:
        id (int | Unset):
        field (str | Unset): Dotted path of the corrected fact, e.g. resolution.winner.
        prev_value (Any | Unset):
        next_value (Any | Unset):
        reason_code (str | Unset): Stable machine code, never free text: resolution_set,
            resolution_reversal, resolution_cleared, resolution_time_corrected,
            resolution_state_changed, member_added, member_removed,
            orientation_changed, merged_into, split_from, created.
        effective_at (datetime.datetime | None | Unset): When the change became true at the SOURCE. Null when the venue
            states none; never back-filled with the observation time.
        observed_at (datetime.datetime | Unset):
        evidence (PublicPmEventRevisionEvidence | Unset): Provenance for this correction. runId and captureId are null
            for
            watch-lane resolution changes, which re-fetch a single event by id
            rather than deriving from a daily sweep capture.
        supersedes_id (int | None | Unset): The earlier revision of the same field this replaces.
    """

    id: int | Unset = UNSET
    field: str | Unset = UNSET
    prev_value: Any | Unset = UNSET
    next_value: Any | Unset = UNSET
    reason_code: str | Unset = UNSET
    effective_at: datetime.datetime | None | Unset = UNSET
    observed_at: datetime.datetime | Unset = UNSET
    evidence: PublicPmEventRevisionEvidence | Unset = UNSET
    supersedes_id: int | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        field = self.field

        prev_value = self.prev_value

        next_value = self.next_value

        reason_code = self.reason_code

        effective_at: None | str | Unset
        if isinstance(self.effective_at, Unset):
            effective_at = UNSET
        elif isinstance(self.effective_at, datetime.datetime):
            effective_at = self.effective_at.isoformat()
        else:
            effective_at = self.effective_at

        observed_at: str | Unset = UNSET
        if not isinstance(self.observed_at, Unset):
            observed_at = self.observed_at.isoformat()

        evidence: dict[str, Any] | Unset = UNSET
        if not isinstance(self.evidence, Unset):
            evidence = self.evidence.to_dict()

        supersedes_id: int | None | Unset
        if isinstance(self.supersedes_id, Unset):
            supersedes_id = UNSET
        else:
            supersedes_id = self.supersedes_id

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if id is not UNSET:
            field_dict["id"] = id
        if field is not UNSET:
            field_dict["field"] = field
        if prev_value is not UNSET:
            field_dict["prevValue"] = prev_value
        if next_value is not UNSET:
            field_dict["nextValue"] = next_value
        if reason_code is not UNSET:
            field_dict["reasonCode"] = reason_code
        if effective_at is not UNSET:
            field_dict["effectiveAt"] = effective_at
        if observed_at is not UNSET:
            field_dict["observedAt"] = observed_at
        if evidence is not UNSET:
            field_dict["evidence"] = evidence
        if supersedes_id is not UNSET:
            field_dict["supersedesId"] = supersedes_id

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_event_revision_evidence import PublicPmEventRevisionEvidence

        d = dict(src_dict)
        id = d.pop("id", UNSET)

        field = d.pop("field", UNSET)

        prev_value = d.pop("prevValue", UNSET)

        next_value = d.pop("nextValue", UNSET)

        reason_code = d.pop("reasonCode", UNSET)

        def _parse_effective_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                effective_at_type_0 = datetime.datetime.fromisoformat(data)

                return effective_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        effective_at = _parse_effective_at(d.pop("effectiveAt", UNSET))

        _observed_at = d.pop("observedAt", UNSET)
        observed_at: datetime.datetime | Unset
        if isinstance(_observed_at, Unset):
            observed_at = UNSET
        else:
            observed_at = datetime.datetime.fromisoformat(_observed_at)

        _evidence = d.pop("evidence", UNSET)
        evidence: PublicPmEventRevisionEvidence | Unset
        if isinstance(_evidence, Unset):
            evidence = UNSET
        else:
            evidence = PublicPmEventRevisionEvidence.from_dict(_evidence)

        def _parse_supersedes_id(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        supersedes_id = _parse_supersedes_id(d.pop("supersedesId", UNSET))

        public_pm_event_revision = cls(
            id=id,
            field=field,
            prev_value=prev_value,
            next_value=next_value,
            reason_code=reason_code,
            effective_at=effective_at,
            observed_at=observed_at,
            evidence=evidence,
            supersedes_id=supersedes_id,
        )

        public_pm_event_revision.additional_properties = d
        return public_pm_event_revision

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
