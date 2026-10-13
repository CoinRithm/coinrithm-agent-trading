from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PmPaperV2Refused")


@_attrs_define
class PmPaperV2Refused:
    """
    Attributes:
        execution_model (Literal['pm_paper_v2']):
        accepted (bool):
        executed (bool):
        kind (Literal['refused']):
        reason (str): One refusal code, or several comma-joined gate codes. See the operation description.
        replay_missing (bool | Unset): Replay endpoint only, with HTTP 404 and `reason: no_existing_receipt`.
    """

    execution_model: Literal["pm_paper_v2"]
    accepted: bool
    executed: bool
    kind: Literal["refused"]
    reason: str
    replay_missing: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        execution_model = self.execution_model

        accepted = self.accepted

        executed = self.executed

        kind = self.kind

        reason = self.reason

        replay_missing = self.replay_missing

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "executionModel": execution_model,
                "accepted": accepted,
                "executed": executed,
                "kind": kind,
                "reason": reason,
            }
        )
        if replay_missing is not UNSET:
            field_dict["replayMissing"] = replay_missing

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        execution_model = cast(Literal["pm_paper_v2"], d.pop("executionModel"))
        if execution_model != "pm_paper_v2":
            raise ValueError(f"executionModel must match const 'pm_paper_v2', got '{execution_model}'")

        accepted = d.pop("accepted")

        executed = d.pop("executed")

        kind = cast(Literal["refused"], d.pop("kind"))
        if kind != "refused":
            raise ValueError(f"kind must match const 'refused', got '{kind}'")

        reason = d.pop("reason")

        replay_missing = d.pop("replayMissing", UNSET)

        pm_paper_v2_refused = cls(
            execution_model=execution_model,
            accepted=accepted,
            executed=executed,
            kind=kind,
            reason=reason,
            replay_missing=replay_missing,
        )

        pm_paper_v2_refused.additional_properties = d
        return pm_paper_v2_refused

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
