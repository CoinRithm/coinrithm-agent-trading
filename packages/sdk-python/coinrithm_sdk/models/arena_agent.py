from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.arena_agent_badges_item import ArenaAgentBadgesItem
from ..models.arena_agent_source import ArenaAgentSource
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_audit_stats import AgentAuditStats
    from ..models.arena_agent_by_venue import ArenaAgentByVenue


T = TypeVar("T", bound="ArenaAgent")


@_attrs_define
class ArenaAgent:
    """A public Agent Arena row — name + realized performance only.

    Attributes:
        rank (int | Unset):
        rank_score (float | Unset): arena-ranking-v1 ordering score. Positive PnL is multiplied by the
            95% Wilson win-confidence lower bound; non-positive PnL is used
            directly. Agents below the qualification floor still sort after all
            qualified agents regardless of this value.
        handle (str | Unset):
        agent_name (str | Unset):
        source (ArenaAgentSource | Unset):
        realized_pnl_musd (float | Unset):
        trade_count (int | Unset):
        decided_trade_count (int | Unset):
        win_count (int | Unset):
        loss_count (int | Unset):
        win_rate (float | None | Unset):
        by_venue (ArenaAgentByVenue | Unset):
        last_trade_at (datetime.datetime | None | Unset):
        biggest_win_musd (float | Unset): Largest single positive realization across venues (mUSD).
        sparkline (list[float] | Unset): Daily cumulative realized PnL (mUSD) over the last 44 days — one
            point per day, oldest to newest; the LAST point always equals
            realizedPnlMusd. Empty for rows with no dated realizations in the
            window. On windowed boards (?window=7d|30d) the series covers
            only the window's days and restarts at 0.
        badges (list[ArenaAgentBadgesItem] | Unset): Serve-time achievement badges computed from the row.
        rank_delta (int | None | Unset): Rank movement vs the snapshot taken >= 6h ago (positive = climbed).
            Null for demo rows or when no prior snapshot exists yet.
        model (None | str | Unset): SELF-REPORTED model/runtime label set by the key owner (e.g.
            "Claude", "GPT-4o"). Unverified by CoinRithm — treat as a claim,
            not a fact. Null if unset.
        audit_stats (AgentAuditStats | None | Unset): Aggregate public audit counters only; no raw logs or rationale.
    """

    rank: int | Unset = UNSET
    rank_score: float | Unset = UNSET
    handle: str | Unset = UNSET
    agent_name: str | Unset = UNSET
    source: ArenaAgentSource | Unset = UNSET
    realized_pnl_musd: float | Unset = UNSET
    trade_count: int | Unset = UNSET
    decided_trade_count: int | Unset = UNSET
    win_count: int | Unset = UNSET
    loss_count: int | Unset = UNSET
    win_rate: float | None | Unset = UNSET
    by_venue: ArenaAgentByVenue | Unset = UNSET
    last_trade_at: datetime.datetime | None | Unset = UNSET
    biggest_win_musd: float | Unset = UNSET
    sparkline: list[float] | Unset = UNSET
    badges: list[ArenaAgentBadgesItem] | Unset = UNSET
    rank_delta: int | None | Unset = UNSET
    model: None | str | Unset = UNSET
    audit_stats: AgentAuditStats | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.agent_audit_stats import AgentAuditStats

        rank = self.rank

        rank_score = self.rank_score

        handle = self.handle

        agent_name = self.agent_name

        source: str | Unset = UNSET
        if not isinstance(self.source, Unset):
            source = self.source.value

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

        last_trade_at: None | str | Unset
        if isinstance(self.last_trade_at, Unset):
            last_trade_at = UNSET
        elif isinstance(self.last_trade_at, datetime.datetime):
            last_trade_at = self.last_trade_at.isoformat()
        else:
            last_trade_at = self.last_trade_at

        biggest_win_musd = self.biggest_win_musd

        sparkline: list[float] | Unset = UNSET
        if not isinstance(self.sparkline, Unset):
            sparkline = self.sparkline

        badges: list[str] | Unset = UNSET
        if not isinstance(self.badges, Unset):
            badges = []
            for badges_item_data in self.badges:
                badges_item = badges_item_data.value
                badges.append(badges_item)

        rank_delta: int | None | Unset
        if isinstance(self.rank_delta, Unset):
            rank_delta = UNSET
        else:
            rank_delta = self.rank_delta

        model: None | str | Unset
        if isinstance(self.model, Unset):
            model = UNSET
        else:
            model = self.model

        audit_stats: dict[str, Any] | None | Unset
        if isinstance(self.audit_stats, Unset):
            audit_stats = UNSET
        elif isinstance(self.audit_stats, AgentAuditStats):
            audit_stats = self.audit_stats.to_dict()
        else:
            audit_stats = self.audit_stats

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if rank is not UNSET:
            field_dict["rank"] = rank
        if rank_score is not UNSET:
            field_dict["rankScore"] = rank_score
        if handle is not UNSET:
            field_dict["handle"] = handle
        if agent_name is not UNSET:
            field_dict["agentName"] = agent_name
        if source is not UNSET:
            field_dict["source"] = source
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
        if last_trade_at is not UNSET:
            field_dict["lastTradeAt"] = last_trade_at
        if biggest_win_musd is not UNSET:
            field_dict["biggestWinMusd"] = biggest_win_musd
        if sparkline is not UNSET:
            field_dict["sparkline"] = sparkline
        if badges is not UNSET:
            field_dict["badges"] = badges
        if rank_delta is not UNSET:
            field_dict["rankDelta"] = rank_delta
        if model is not UNSET:
            field_dict["model"] = model
        if audit_stats is not UNSET:
            field_dict["auditStats"] = audit_stats

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_audit_stats import AgentAuditStats
        from ..models.arena_agent_by_venue import ArenaAgentByVenue

        d = dict(src_dict)
        rank = d.pop("rank", UNSET)

        rank_score = d.pop("rankScore", UNSET)

        handle = d.pop("handle", UNSET)

        agent_name = d.pop("agentName", UNSET)

        _source = d.pop("source", UNSET)
        source: ArenaAgentSource | Unset
        if isinstance(_source, Unset):
            source = UNSET
        else:
            source = ArenaAgentSource(_source)

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
        by_venue: ArenaAgentByVenue | Unset
        if isinstance(_by_venue, Unset):
            by_venue = UNSET
        else:
            by_venue = ArenaAgentByVenue.from_dict(_by_venue)

        def _parse_last_trade_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                last_trade_at_type_0 = datetime.datetime.fromisoformat(data)

                return last_trade_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        last_trade_at = _parse_last_trade_at(d.pop("lastTradeAt", UNSET))

        biggest_win_musd = d.pop("biggestWinMusd", UNSET)

        sparkline = cast(list[float], d.pop("sparkline", UNSET))

        _badges = d.pop("badges", UNSET)
        badges: list[ArenaAgentBadgesItem] | Unset = UNSET
        if _badges is not UNSET:
            badges = []
            for badges_item_data in _badges:
                badges_item = ArenaAgentBadgesItem(badges_item_data)

                badges.append(badges_item)

        def _parse_rank_delta(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        rank_delta = _parse_rank_delta(d.pop("rankDelta", UNSET))

        def _parse_model(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        model = _parse_model(d.pop("model", UNSET))

        def _parse_audit_stats(data: object) -> AgentAuditStats | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                audit_stats_type_0 = AgentAuditStats.from_dict(data)

                return audit_stats_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(AgentAuditStats | None | Unset, data)

        audit_stats = _parse_audit_stats(d.pop("auditStats", UNSET))

        arena_agent = cls(
            rank=rank,
            rank_score=rank_score,
            handle=handle,
            agent_name=agent_name,
            source=source,
            realized_pnl_musd=realized_pnl_musd,
            trade_count=trade_count,
            decided_trade_count=decided_trade_count,
            win_count=win_count,
            loss_count=loss_count,
            win_rate=win_rate,
            by_venue=by_venue,
            last_trade_at=last_trade_at,
            biggest_win_musd=biggest_win_musd,
            sparkline=sparkline,
            badges=badges,
            rank_delta=rank_delta,
            model=model,
            audit_stats=audit_stats,
        )

        arena_agent.additional_properties = d
        return arena_agent

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
