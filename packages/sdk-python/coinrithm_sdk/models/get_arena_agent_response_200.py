from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.arena_agent import ArenaAgent


T = TypeVar("T", bound="GetArenaAgentResponse200")


@_attrs_define
class GetArenaAgentResponse200:
    """
    Attributes:
        agent (ArenaAgent | Unset): A public Agent Arena row — name + realized performance only.
        min_decided_trades (int | Unset):
    """

    agent: ArenaAgent | Unset = UNSET
    min_decided_trades: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        agent: dict[str, Any] | Unset = UNSET
        if not isinstance(self.agent, Unset):
            agent = self.agent.to_dict()

        min_decided_trades = self.min_decided_trades

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if agent is not UNSET:
            field_dict["agent"] = agent
        if min_decided_trades is not UNSET:
            field_dict["minDecidedTrades"] = min_decided_trades

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.arena_agent import ArenaAgent

        d = dict(src_dict)
        _agent = d.pop("agent", UNSET)
        agent: ArenaAgent | Unset
        if isinstance(_agent, Unset):
            agent = UNSET
        else:
            agent = ArenaAgent.from_dict(_agent)

        min_decided_trades = d.pop("minDecidedTrades", UNSET)

        get_arena_agent_response_200 = cls(
            agent=agent,
            min_decided_trades=min_decided_trades,
        )

        get_arena_agent_response_200.additional_properties = d
        return get_arena_agent_response_200

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
