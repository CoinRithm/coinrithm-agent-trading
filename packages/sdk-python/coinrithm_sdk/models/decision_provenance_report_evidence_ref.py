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






T = TypeVar("T", bound="DecisionProvenanceReportEvidenceRef")



@_attrs_define
class DecisionProvenanceReportEvidenceRef:
    """ Pointers to the observation evidence (never the evidence itself).

        Attributes:
            snapshot_ids (list[str] | Unset): Opaque snapshot ids (capped at 100).
            source_captured_at (datetime.datetime | Unset): Source capture time (ISO 8601).
     """

    snapshot_ids: list[str] | Unset = UNSET
    source_captured_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        snapshot_ids: list[str] | Unset = UNSET
        if not isinstance(self.snapshot_ids, Unset):
            snapshot_ids = self.snapshot_ids



        source_captured_at: str | Unset = UNSET
        if not isinstance(self.source_captured_at, Unset):
            source_captured_at = self.source_captured_at.isoformat()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if snapshot_ids is not UNSET:
            field_dict["snapshotIds"] = snapshot_ids
        if source_captured_at is not UNSET:
            field_dict["sourceCapturedAt"] = source_captured_at

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        snapshot_ids = cast(list[str], d.pop("snapshotIds", UNSET))


        _source_captured_at = d.pop("sourceCapturedAt", UNSET)
        source_captured_at: datetime.datetime | Unset
        if isinstance(_source_captured_at,  Unset):
            source_captured_at = UNSET
        else:
            source_captured_at = isoparse(_source_captured_at)




        decision_provenance_report_evidence_ref = cls(
            snapshot_ids=snapshot_ids,
            source_captured_at=source_captured_at,
        )


        decision_provenance_report_evidence_ref.additional_properties = d
        return decision_provenance_report_evidence_ref

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
