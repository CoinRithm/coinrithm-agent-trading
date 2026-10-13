from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.agent_universe_sector_kind import AgentUniverseSectorKind
from ..models.agent_universe_sector_tier import AgentUniverseSectorTier
from ..types import UNSET, Unset

T = TypeVar("T", bound="AgentUniverseSector")


@_attrs_define
class AgentUniverseSector:
    """
    Attributes:
        id (str):
        label (str):
        kind (AgentUniverseSectorKind):
        coin_count (int):
        tier (AgentUniverseSectorTier | Unset): Ecosystems only; primary entries lead the picker.
    """

    id: str
    label: str
    kind: AgentUniverseSectorKind
    coin_count: int
    tier: AgentUniverseSectorTier | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        label = self.label

        kind = self.kind.value

        coin_count = self.coin_count

        tier: str | Unset = UNSET
        if not isinstance(self.tier, Unset):
            tier = self.tier.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "label": label,
                "kind": kind,
                "coinCount": coin_count,
            }
        )
        if tier is not UNSET:
            field_dict["tier"] = tier

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        label = d.pop("label")

        kind = AgentUniverseSectorKind(d.pop("kind"))

        coin_count = d.pop("coinCount")

        _tier = d.pop("tier", UNSET)
        tier: AgentUniverseSectorTier | Unset
        if isinstance(_tier, Unset):
            tier = UNSET
        else:
            tier = AgentUniverseSectorTier(_tier)

        agent_universe_sector = cls(
            id=id,
            label=label,
            kind=kind,
            coin_count=coin_count,
            tier=tier,
        )

        agent_universe_sector.additional_properties = d
        return agent_universe_sector

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
