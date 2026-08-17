from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="AgentPortfolioProgressionType0")


@_attrs_define
class AgentPortfolioProgressionType0:
    """Compact, non-identifying gamification block.

    Attributes:
        league (None | str | Unset):
        xp_points (int | Unset):
        rank_in_league (int | None | Unset):
        tasks (Any | Unset):
    """

    league: None | str | Unset = UNSET
    xp_points: int | Unset = UNSET
    rank_in_league: int | None | Unset = UNSET
    tasks: Any | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        league: None | str | Unset
        if isinstance(self.league, Unset):
            league = UNSET
        else:
            league = self.league

        xp_points = self.xp_points

        rank_in_league: int | None | Unset
        if isinstance(self.rank_in_league, Unset):
            rank_in_league = UNSET
        else:
            rank_in_league = self.rank_in_league

        tasks = self.tasks

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if league is not UNSET:
            field_dict["league"] = league
        if xp_points is not UNSET:
            field_dict["xpPoints"] = xp_points
        if rank_in_league is not UNSET:
            field_dict["rankInLeague"] = rank_in_league
        if tasks is not UNSET:
            field_dict["tasks"] = tasks

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_league(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        league = _parse_league(d.pop("league", UNSET))

        xp_points = d.pop("xpPoints", UNSET)

        def _parse_rank_in_league(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        rank_in_league = _parse_rank_in_league(d.pop("rankInLeague", UNSET))

        tasks = d.pop("tasks", UNSET)

        agent_portfolio_progression_type_0 = cls(
            league=league,
            xp_points=xp_points,
            rank_in_league=rank_in_league,
            tasks=tasks,
        )

        agent_portfolio_progression_type_0.additional_properties = d
        return agent_portfolio_progression_type_0

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
