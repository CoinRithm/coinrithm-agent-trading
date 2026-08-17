from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.competition_board_row import CompetitionBoardRow
    from ..models.competition_meta import CompetitionMeta


T = TypeVar("T", bound="GetCompetitionBoardResponse200")


@_attrs_define
class GetCompetitionBoardResponse200:
    """
    Attributes:
        competition (CompetitionMeta | Unset): Public competition metadata — no ids, owners, or invite codes.
        min_decided_trades (int | Unset):
        rows (list[CompetitionBoardRow] | Unset):
        as_of (datetime.datetime | Unset):
    """

    competition: CompetitionMeta | Unset = UNSET
    min_decided_trades: int | Unset = UNSET
    rows: list[CompetitionBoardRow] | Unset = UNSET
    as_of: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        competition: dict[str, Any] | Unset = UNSET
        if not isinstance(self.competition, Unset):
            competition = self.competition.to_dict()

        min_decided_trades = self.min_decided_trades

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
        if competition is not UNSET:
            field_dict["competition"] = competition
        if min_decided_trades is not UNSET:
            field_dict["minDecidedTrades"] = min_decided_trades
        if rows is not UNSET:
            field_dict["rows"] = rows
        if as_of is not UNSET:
            field_dict["asOf"] = as_of

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.competition_board_row import CompetitionBoardRow
        from ..models.competition_meta import CompetitionMeta

        d = dict(src_dict)
        _competition = d.pop("competition", UNSET)
        competition: CompetitionMeta | Unset
        if isinstance(_competition, Unset):
            competition = UNSET
        else:
            competition = CompetitionMeta.from_dict(_competition)

        min_decided_trades = d.pop("minDecidedTrades", UNSET)

        _rows = d.pop("rows", UNSET)
        rows: list[CompetitionBoardRow] | Unset = UNSET
        if _rows is not UNSET:
            rows = []
            for rows_item_data in _rows:
                rows_item = CompetitionBoardRow.from_dict(rows_item_data)

                rows.append(rows_item)

        _as_of = d.pop("asOf", UNSET)
        as_of: datetime.datetime | Unset
        if isinstance(_as_of, Unset):
            as_of = UNSET
        else:
            as_of = datetime.datetime.fromisoformat(_as_of)

        get_competition_board_response_200 = cls(
            competition=competition,
            min_decided_trades=min_decided_trades,
            rows=rows,
            as_of=as_of,
        )

        get_competition_board_response_200.additional_properties = d
        return get_competition_board_response_200

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
