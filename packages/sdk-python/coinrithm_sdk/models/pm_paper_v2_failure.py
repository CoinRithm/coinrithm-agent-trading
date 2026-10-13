from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PmPaperV2Failure")


@_attrs_define
class PmPaperV2Failure:
    """Shape-check (400) or runtime (503) failure of a pm_paper_v2 write; no `kind` field.

    Attributes:
        execution_model (Literal['pm_paper_v2']):
        accepted (bool):
        executed (bool):
        reason (str):
    """

    execution_model: Literal["pm_paper_v2"]
    accepted: bool
    executed: bool
    reason: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        execution_model = self.execution_model

        accepted = self.accepted

        executed = self.executed

        reason = self.reason

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "executionModel": execution_model,
                "accepted": accepted,
                "executed": executed,
                "reason": reason,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        execution_model = cast(Literal["pm_paper_v2"], d.pop("executionModel"))
        if execution_model != "pm_paper_v2":
            raise ValueError(f"executionModel must match const 'pm_paper_v2', got '{execution_model}'")

        accepted = d.pop("accepted")

        executed = d.pop("executed")

        reason = d.pop("reason")

        pm_paper_v2_failure = cls(
            execution_model=execution_model,
            accepted=accepted,
            executed=executed,
            reason=reason,
        )

        pm_paper_v2_failure.additional_properties = d
        return pm_paper_v2_failure

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
