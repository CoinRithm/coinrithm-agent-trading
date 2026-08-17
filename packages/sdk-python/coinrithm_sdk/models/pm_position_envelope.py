from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.pm_position import PmPosition


T = TypeVar("T", bound="PmPositionEnvelope")


@_attrs_define
class PmPositionEnvelope:
    """
    Attributes:
        position (PmPosition | Unset): Mock PM position. Live-mark fields (currentProbability, unrealizedMark,
            unrealizedPnl) are added only on OPEN positions in the list endpoint and
            may be null.
        idempotent_replay (bool | Unset):
    """

    position: PmPosition | Unset = UNSET
    idempotent_replay: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        position: dict[str, Any] | Unset = UNSET
        if not isinstance(self.position, Unset):
            position = self.position.to_dict()

        idempotent_replay = self.idempotent_replay

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if position is not UNSET:
            field_dict["position"] = position
        if idempotent_replay is not UNSET:
            field_dict["idempotentReplay"] = idempotent_replay

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.pm_position import PmPosition

        d = dict(src_dict)
        _position = d.pop("position", UNSET)
        position: PmPosition | Unset
        if isinstance(_position, Unset):
            position = UNSET
        else:
            position = PmPosition.from_dict(_position)

        idempotent_replay = d.pop("idempotentReplay", UNSET)

        pm_position_envelope = cls(
            position=position,
            idempotent_replay=idempotent_replay,
        )

        pm_position_envelope.additional_properties = d
        return pm_position_envelope

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
