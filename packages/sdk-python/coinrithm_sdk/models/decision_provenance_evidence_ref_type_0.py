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






T = TypeVar("T", bound="DecisionProvenanceEvidenceRefType0")



@_attrs_define
class DecisionProvenanceEvidenceRefType0:
    """ Pointers to the observation evidence (never the evidence itself).

        Attributes:
            snapshot_ids (list[str] | None | Unset):
            source_captured_at (datetime.datetime | None | Unset):
     """

    snapshot_ids: list[str] | None | Unset = UNSET
    source_captured_at: datetime.datetime | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        snapshot_ids: list[str] | None | Unset
        if isinstance(self.snapshot_ids, Unset):
            snapshot_ids = UNSET
        elif isinstance(self.snapshot_ids, list):
            snapshot_ids = self.snapshot_ids


        else:
            snapshot_ids = self.snapshot_ids

        source_captured_at: None | str | Unset
        if isinstance(self.source_captured_at, Unset):
            source_captured_at = UNSET
        elif isinstance(self.source_captured_at, datetime.datetime):
            source_captured_at = self.source_captured_at.isoformat()
        else:
            source_captured_at = self.source_captured_at


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
        def _parse_snapshot_ids(data: object) -> list[str] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                snapshot_ids_type_0 = cast(list[str], data)

                return snapshot_ids_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[str] | None | Unset, data)

        snapshot_ids = _parse_snapshot_ids(d.pop("snapshotIds", UNSET))


        def _parse_source_captured_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                source_captured_at_type_0 = isoparse(data)



                return source_captured_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        source_captured_at = _parse_source_captured_at(d.pop("sourceCapturedAt", UNSET))


        decision_provenance_evidence_ref_type_0 = cls(
            snapshot_ids=snapshot_ids,
            source_captured_at=source_captured_at,
        )


        decision_provenance_evidence_ref_type_0.additional_properties = d
        return decision_provenance_evidence_ref_type_0

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
