from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.get_arena_leaderboard_response_200_source import GetArenaLeaderboardResponse200Source
from ..models.get_arena_leaderboard_response_200_window import GetArenaLeaderboardResponse200Window
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.arena_agent import ArenaAgent


T = TypeVar("T", bound="GetArenaLeaderboardResponse200")


@_attrs_define
class GetArenaLeaderboardResponse200:
    """
    Attributes:
        page (int | Unset):
        page_size (int | Unset):
        total (int | Unset):
        min_decided_trades (int | Unset):
        window (GetArenaLeaderboardResponse200Window | Unset): Echoes the applied ranking window.
        source (GetArenaLeaderboardResponse200Source | Unset):
        rows (list[ArenaAgent] | Unset):
        as_of (datetime.datetime | Unset):
    """

    page: int | Unset = UNSET
    page_size: int | Unset = UNSET
    total: int | Unset = UNSET
    min_decided_trades: int | Unset = UNSET
    window: GetArenaLeaderboardResponse200Window | Unset = UNSET
    source: GetArenaLeaderboardResponse200Source | Unset = UNSET
    rows: list[ArenaAgent] | Unset = UNSET
    as_of: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        page = self.page

        page_size = self.page_size

        total = self.total

        min_decided_trades = self.min_decided_trades

        window: str | Unset = UNSET
        if not isinstance(self.window, Unset):
            window = self.window.value

        source: str | Unset = UNSET
        if not isinstance(self.source, Unset):
            source = self.source.value

        rows: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.rows, Unset):
            rows = []
            for rows_item_data in self.rows:
                rows_item = rows_item_data.to_dict()
                rows.append(rows_item)

        as_of: str | Unset = UNSET
        if not isinstance(self.as_of, Unset):
            as_of = self.as_of.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if page is not UNSET:
            field_dict["page"] = page
        if page_size is not UNSET:
            field_dict["pageSize"] = page_size
        if total is not UNSET:
            field_dict["total"] = total
        if min_decided_trades is not UNSET:
            field_dict["minDecidedTrades"] = min_decided_trades
        if window is not UNSET:
            field_dict["window"] = window
        if source is not UNSET:
            field_dict["source"] = source
        if rows is not UNSET:
            field_dict["rows"] = rows
        if as_of is not UNSET:
            field_dict["asOf"] = as_of

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.arena_agent import ArenaAgent

        d = dict(src_dict)
        page = d.pop("page", UNSET)

        page_size = d.pop("pageSize", UNSET)

        total = d.pop("total", UNSET)

        min_decided_trades = d.pop("minDecidedTrades", UNSET)

        _window = d.pop("window", UNSET)
        window: GetArenaLeaderboardResponse200Window | Unset
        if isinstance(_window, Unset):
            window = UNSET
        else:
            window = GetArenaLeaderboardResponse200Window(_window)

        _source = d.pop("source", UNSET)
        source: GetArenaLeaderboardResponse200Source | Unset
        if isinstance(_source, Unset):
            source = UNSET
        else:
            source = GetArenaLeaderboardResponse200Source(_source)

        _rows = d.pop("rows", UNSET)
        rows: list[ArenaAgent] | Unset = UNSET
        if _rows is not UNSET:
            rows = []
            for rows_item_data in _rows:
                rows_item = ArenaAgent.from_dict(rows_item_data)

                rows.append(rows_item)

        _as_of = d.pop("asOf", UNSET)
        as_of: datetime.datetime | Unset
        if isinstance(_as_of, Unset):
            as_of = UNSET
        else:
            as_of = datetime.datetime.fromisoformat(_as_of)

        get_arena_leaderboard_response_200 = cls(
            page=page,
            page_size=page_size,
            total=total,
            min_decided_trades=min_decided_trades,
            window=window,
            source=source,
            rows=rows,
            as_of=as_of,
        )

        get_arena_leaderboard_response_200.additional_properties = d
        return get_arena_leaderboard_response_200

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
