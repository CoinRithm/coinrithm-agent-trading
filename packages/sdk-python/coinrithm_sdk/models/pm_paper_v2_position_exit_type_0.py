from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_paper_v2_exit_status import PmPaperV2ExitStatus

T = TypeVar("T", bound="PmPaperV2PositionExitType0")


@_attrs_define
class PmPaperV2PositionExitType0:
    """
    Attributes:
        id (UUID):
        status (PmPaperV2ExitStatus): pending/retry = waiting for the worker; leased = being executed;
            manual_attention = held for operator review; filled = closed;
            cancelled = withdrawn.
        accepted (bool):
        executed (bool):
        requested_at (datetime.datetime):
        next_attempt_at (datetime.datetime):
        last_error (None | str): Last worker failure code (e.g. a venue acquisition code).
        attention_held (bool):
    """

    id: UUID
    status: PmPaperV2ExitStatus
    accepted: bool
    executed: bool
    requested_at: datetime.datetime
    next_attempt_at: datetime.datetime
    last_error: None | str
    attention_held: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        status = self.status.value

        accepted = self.accepted

        executed = self.executed

        requested_at = self.requested_at.isoformat()

        next_attempt_at = self.next_attempt_at.isoformat()

        last_error: None | str
        last_error = self.last_error

        attention_held = self.attention_held

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "status": status,
                "accepted": accepted,
                "executed": executed,
                "requestedAt": requested_at,
                "nextAttemptAt": next_attempt_at,
                "lastError": last_error,
                "attentionHeld": attention_held,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        status = PmPaperV2ExitStatus(d.pop("status"))

        accepted = d.pop("accepted")

        executed = d.pop("executed")

        requested_at = datetime.datetime.fromisoformat(d.pop("requestedAt").replace("Z", "+00:00"))

        next_attempt_at = datetime.datetime.fromisoformat(d.pop("nextAttemptAt").replace("Z", "+00:00"))

        def _parse_last_error(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        last_error = _parse_last_error(d.pop("lastError"))

        attention_held = d.pop("attentionHeld")

        pm_paper_v2_position_exit_type_0 = cls(
            id=id,
            status=status,
            accepted=accepted,
            executed=executed,
            requested_at=requested_at,
            next_attempt_at=next_attempt_at,
            last_error=last_error,
            attention_held=attention_held,
        )

        pm_paper_v2_position_exit_type_0.additional_properties = d
        return pm_paper_v2_position_exit_type_0

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
