from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PmPaperV2Opened")


@_attrs_define
class PmPaperV2Opened:
    """
    Attributes:
        execution_model (Literal['pm_paper_v2']):
        accepted (bool):
        executed (bool):
        kind (Literal['opened']):
        position_id (int):
        replayed (bool): True when an existing position for this idempotencyKey was returned.
    """

    execution_model: Literal["pm_paper_v2"]
    accepted: bool
    executed: bool
    kind: Literal["opened"]
    position_id: int
    replayed: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        execution_model = self.execution_model

        accepted = self.accepted

        executed = self.executed

        kind = self.kind

        position_id = self.position_id

        replayed = self.replayed

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "executionModel": execution_model,
                "accepted": accepted,
                "executed": executed,
                "kind": kind,
                "positionId": position_id,
                "replayed": replayed,
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

        kind = cast(Literal["opened"], d.pop("kind"))
        if kind != "opened":
            raise ValueError(f"kind must match const 'opened', got '{kind}'")

        position_id = d.pop("positionId")

        replayed = d.pop("replayed")

        pm_paper_v2_opened = cls(
            execution_model=execution_model,
            accepted=accepted,
            executed=executed,
            kind=kind,
            position_id=position_id,
            replayed=replayed,
        )

        pm_paper_v2_opened.additional_properties = d
        return pm_paper_v2_opened

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
