from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_paper_v2_close_result_kind import PmPaperV2CloseResultKind
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.pm_paper_v2_close_result_intent import PmPaperV2CloseResultIntent


T = TypeVar("T", bound="PmPaperV2CloseResult")


@_attrs_define
class PmPaperV2CloseResult:
    """
    Attributes:
        execution_model (Literal['pm_paper_v2']):
        accepted (bool): True when an active or filled exit intent exists for the request.
        executed (bool): True only when the intent is `filled`.
        kind (PmPaperV2CloseResultKind):
        position_id (int | Unset): accepted / cancelled only
        intent (PmPaperV2CloseResultIntent | Unset): accepted / cancelled only.
        replayed (bool | Unset): accepted / cancelled only. True when this idempotencyKey was already recorded.
    """

    execution_model: Literal["pm_paper_v2"]
    accepted: bool
    executed: bool
    kind: PmPaperV2CloseResultKind
    position_id: int | Unset = UNSET
    intent: PmPaperV2CloseResultIntent | Unset = UNSET
    replayed: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        execution_model = self.execution_model

        accepted = self.accepted

        executed = self.executed

        kind = self.kind.value

        position_id = self.position_id

        intent: dict[str, Any] | Unset = UNSET
        if not isinstance(self.intent, Unset):
            intent = self.intent.to_dict()

        replayed = self.replayed

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "executionModel": execution_model,
                "accepted": accepted,
                "executed": executed,
                "kind": kind,
            }
        )
        if position_id is not UNSET:
            field_dict["positionId"] = position_id
        if intent is not UNSET:
            field_dict["intent"] = intent
        if replayed is not UNSET:
            field_dict["replayed"] = replayed

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.pm_paper_v2_close_result_intent import PmPaperV2CloseResultIntent

        d = dict(src_dict)
        execution_model = cast(Literal["pm_paper_v2"], d.pop("executionModel"))
        if execution_model != "pm_paper_v2":
            raise ValueError(f"executionModel must match const 'pm_paper_v2', got '{execution_model}'")

        accepted = d.pop("accepted")

        executed = d.pop("executed")

        kind = PmPaperV2CloseResultKind(d.pop("kind"))

        position_id = d.pop("positionId", UNSET)

        _intent = d.pop("intent", UNSET)
        intent: PmPaperV2CloseResultIntent | Unset
        if isinstance(_intent, Unset):
            intent = UNSET
        else:
            intent = PmPaperV2CloseResultIntent.from_dict(_intent)

        replayed = d.pop("replayed", UNSET)

        pm_paper_v2_close_result = cls(
            execution_model=execution_model,
            accepted=accepted,
            executed=executed,
            kind=kind,
            position_id=position_id,
            intent=intent,
            replayed=replayed,
        )

        pm_paper_v2_close_result.additional_properties = d
        return pm_paper_v2_close_result

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
