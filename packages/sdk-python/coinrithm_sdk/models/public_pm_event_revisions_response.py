from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_event_revision import PublicPmEventRevision
    from ..models.public_pm_event_revisions_response_reconstructed import PublicPmEventRevisionsResponseReconstructed


T = TypeVar("T", bound="PublicPmEventRevisionsResponse")


@_attrs_define
class PublicPmEventRevisionsResponse:
    """
    Attributes:
        subject_key (str): Stable identity, "<sourceSlug>:<externalEventId>".
        revisions (list[PublicPmEventRevision]):
        truncated (bool | Unset): True when the newest-first revision page hit its cap. Reconstruction
            is unaffected — asOf reads its own complete, time-bounded set.
        as_of (datetime.datetime | Unset):
        reconstructed (PublicPmEventRevisionsResponseReconstructed | Unset): Field values CoinRithm was publishing at
            asOf, folded by
            OBSERVATION time. Present only when asOf is supplied.
    """

    subject_key: str
    revisions: list[PublicPmEventRevision]
    truncated: bool | Unset = UNSET
    as_of: datetime.datetime | Unset = UNSET
    reconstructed: PublicPmEventRevisionsResponseReconstructed | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        subject_key = self.subject_key

        revisions = []
        for revisions_item_data in self.revisions:
            revisions_item = revisions_item_data.to_dict()
            revisions.append(revisions_item)

        truncated = self.truncated

        as_of: str | Unset = UNSET
        if not isinstance(self.as_of, Unset):
            as_of = self.as_of.isoformat()

        reconstructed: dict[str, Any] | Unset = UNSET
        if not isinstance(self.reconstructed, Unset):
            reconstructed = self.reconstructed.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "subjectKey": subject_key,
                "revisions": revisions,
            }
        )
        if truncated is not UNSET:
            field_dict["truncated"] = truncated
        if as_of is not UNSET:
            field_dict["asOf"] = as_of
        if reconstructed is not UNSET:
            field_dict["reconstructed"] = reconstructed

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_event_revision import PublicPmEventRevision
        from ..models.public_pm_event_revisions_response_reconstructed import (
            PublicPmEventRevisionsResponseReconstructed,
        )

        d = dict(src_dict)
        subject_key = d.pop("subjectKey")

        revisions = []
        _revisions = d.pop("revisions")
        for revisions_item_data in _revisions:
            revisions_item = PublicPmEventRevision.from_dict(revisions_item_data)

            revisions.append(revisions_item)

        truncated = d.pop("truncated", UNSET)

        _as_of = d.pop("asOf", UNSET)
        as_of: datetime.datetime | Unset
        if isinstance(_as_of, Unset):
            as_of = UNSET
        else:
            as_of = datetime.datetime.fromisoformat(_as_of)

        _reconstructed = d.pop("reconstructed", UNSET)
        reconstructed: PublicPmEventRevisionsResponseReconstructed | Unset
        if isinstance(_reconstructed, Unset):
            reconstructed = UNSET
        else:
            reconstructed = PublicPmEventRevisionsResponseReconstructed.from_dict(_reconstructed)

        public_pm_event_revisions_response = cls(
            subject_key=subject_key,
            revisions=revisions,
            truncated=truncated,
            as_of=as_of,
            reconstructed=reconstructed,
        )

        public_pm_event_revisions_response.additional_properties = d
        return public_pm_event_revisions_response

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
