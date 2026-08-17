from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="ScorecardRunPointer")


@_attrs_define
class ScorecardRunPointer:
    """Compact pointer to one immutable scorecard run.

    Attributes:
        id (int): ScorecardRun id — fetch the full run from /api/arena/scorecard-runs/{id}.
        computed_at (datetime.datetime): When the snapshot was computed/frozen.
        content_hash (str): sha256 (hex) of the frozen resultJson — reproducible snapshot fingerprint.
    """

    id: int
    computed_at: datetime.datetime
    content_hash: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        computed_at = self.computed_at.isoformat()

        content_hash = self.content_hash

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "computedAt": computed_at,
                "contentHash": content_hash,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        computed_at = datetime.datetime.fromisoformat(d.pop("computedAt"))

        content_hash = d.pop("contentHash")

        scorecard_run_pointer = cls(
            id=id,
            computed_at=computed_at,
            content_hash=content_hash,
        )

        scorecard_run_pointer.additional_properties = d
        return scorecard_run_pointer

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
