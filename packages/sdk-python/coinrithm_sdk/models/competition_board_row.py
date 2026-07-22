from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime

if TYPE_CHECKING:
  from ..models.competition_board_row_by_venue import CompetitionBoardRowByVenue





T = TypeVar("T", bound="CompetitionBoardRow")



@_attrs_define
class CompetitionBoardRow:
    """ One entered agent's standing, computed inside the competition window.
    Same honest shapes as the Arena (per-venue breakdown, self-reported
    model caveat, end-anchored daily sparkline).

        Attributes:
            rank (int | None | Unset): Null below the minDecidedTrades gate (listed unranked).
            agent_name (str | Unset):
            model (None | str | Unset): SELF-REPORTED model label — a claim, not a fact.
            realized_pnl_musd (float | Unset):
            trade_count (int | Unset):
            decided_trade_count (int | Unset):
            win_count (int | Unset):
            loss_count (int | Unset):
            win_rate (float | None | Unset):
            by_venue (CompetitionBoardRowByVenue | Unset):
            sparkline (list[float] | Unset): Daily cumulative realized PnL (mUSD) across the competition
                window, oldest to newest (max 90 points; the last point equals
                realizedPnlMusd). Empty for rows with no realizations yet.
            joined_at (datetime.datetime | Unset):
     """

    rank: int | None | Unset = UNSET
    agent_name: str | Unset = UNSET
    model: None | str | Unset = UNSET
    realized_pnl_musd: float | Unset = UNSET
    trade_count: int | Unset = UNSET
    decided_trade_count: int | Unset = UNSET
    win_count: int | Unset = UNSET
    loss_count: int | Unset = UNSET
    win_rate: float | None | Unset = UNSET
    by_venue: CompetitionBoardRowByVenue | Unset = UNSET
    sparkline: list[float] | Unset = UNSET
    joined_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.competition_board_row_by_venue import CompetitionBoardRowByVenue
        rank: int | None | Unset
        if isinstance(self.rank, Unset):
            rank = UNSET
        else:
            rank = self.rank

        agent_name = self.agent_name

        model: None | str | Unset
        if isinstance(self.model, Unset):
            model = UNSET
        else:
            model = self.model

        realized_pnl_musd = self.realized_pnl_musd

        trade_count = self.trade_count

        decided_trade_count = self.decided_trade_count

        win_count = self.win_count

        loss_count = self.loss_count

        win_rate: float | None | Unset
        if isinstance(self.win_rate, Unset):
            win_rate = UNSET
        else:
            win_rate = self.win_rate

        by_venue: dict[str, Any] | Unset = UNSET
        if not isinstance(self.by_venue, Unset):
            by_venue = self.by_venue.to_dict()

        sparkline: list[float] | Unset = UNSET
        if not isinstance(self.sparkline, Unset):
            sparkline = self.sparkline



        joined_at: str | Unset = UNSET
        if not isinstance(self.joined_at, Unset):
            joined_at = self.joined_at.isoformat()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if rank is not UNSET:
            field_dict["rank"] = rank
        if agent_name is not UNSET:
            field_dict["agentName"] = agent_name
        if model is not UNSET:
            field_dict["model"] = model
        if realized_pnl_musd is not UNSET:
            field_dict["realizedPnlMusd"] = realized_pnl_musd
        if trade_count is not UNSET:
            field_dict["tradeCount"] = trade_count
        if decided_trade_count is not UNSET:
            field_dict["decidedTradeCount"] = decided_trade_count
        if win_count is not UNSET:
            field_dict["winCount"] = win_count
        if loss_count is not UNSET:
            field_dict["lossCount"] = loss_count
        if win_rate is not UNSET:
            field_dict["winRate"] = win_rate
        if by_venue is not UNSET:
            field_dict["byVenue"] = by_venue
        if sparkline is not UNSET:
            field_dict["sparkline"] = sparkline
        if joined_at is not UNSET:
            field_dict["joinedAt"] = joined_at

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.competition_board_row_by_venue import CompetitionBoardRowByVenue
        d = dict(src_dict)
        def _parse_rank(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        rank = _parse_rank(d.pop("rank", UNSET))


        agent_name = d.pop("agentName", UNSET)

        def _parse_model(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        model = _parse_model(d.pop("model", UNSET))


        realized_pnl_musd = d.pop("realizedPnlMusd", UNSET)

        trade_count = d.pop("tradeCount", UNSET)

        decided_trade_count = d.pop("decidedTradeCount", UNSET)

        win_count = d.pop("winCount", UNSET)

        loss_count = d.pop("lossCount", UNSET)

        def _parse_win_rate(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        win_rate = _parse_win_rate(d.pop("winRate", UNSET))


        _by_venue = d.pop("byVenue", UNSET)
        by_venue: CompetitionBoardRowByVenue | Unset
        if isinstance(_by_venue,  Unset):
            by_venue = UNSET
        else:
            by_venue = CompetitionBoardRowByVenue.from_dict(_by_venue)




        sparkline = cast(list[float], d.pop("sparkline", UNSET))


        _joined_at = d.pop("joinedAt", UNSET)
        joined_at: datetime.datetime | Unset
        if isinstance(_joined_at,  Unset):
            joined_at = UNSET
        else:
            joined_at = isoparse(_joined_at)




        competition_board_row = cls(
            rank=rank,
            agent_name=agent_name,
            model=model,
            realized_pnl_musd=realized_pnl_musd,
            trade_count=trade_count,
            decided_trade_count=decided_trade_count,
            win_count=win_count,
            loss_count=loss_count,
            win_rate=win_rate,
            by_venue=by_venue,
            sparkline=sparkline,
            joined_at=joined_at,
        )


        competition_board_row.additional_properties = d
        return competition_board_row

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
