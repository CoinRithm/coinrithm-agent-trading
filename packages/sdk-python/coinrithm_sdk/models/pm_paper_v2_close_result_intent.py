from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_paper_v2_exit_status import PmPaperV2ExitStatus

T = TypeVar("T", bound="PmPaperV2CloseResultIntent")


@_attrs_define
class PmPaperV2CloseResultIntent:
    """accepted / cancelled only.

    Attributes:
        id (UUID):
        status (PmPaperV2ExitStatus): pending/retry = waiting for the worker; leased = being executed;
            manual_attention = held for operator review; filled = closed;
            cancelled = withdrawn.
    """

    id: UUID
    status: PmPaperV2ExitStatus
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        status = self.status.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "status": status,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        status = PmPaperV2ExitStatus(d.pop("status"))

        pm_paper_v2_close_result_intent = cls(
            id=id,
            status=status,
        )

        pm_paper_v2_close_result_intent.additional_properties = d
        return pm_paper_v2_close_result_intent

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
