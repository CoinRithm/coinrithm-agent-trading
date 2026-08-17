from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_position_side import PmPositionSide
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.freshness import Freshness
    from ..models.pm_position_entry_outcomes_snapshot_type_0 import PmPositionEntryOutcomesSnapshotType0
    from ..models.pm_position_outcome import PmPositionOutcome


T = TypeVar("T", bound="PmPosition")


@_attrs_define
class PmPosition:
    """Mock PM position. Live-mark fields (currentProbability, unrealizedMark,
    unrealizedPnl) are added only on OPEN positions in the list endpoint and
    may be null.

        Attributes:
            id (int | Unset):
            status (str | Unset):
            source (str | Unset):
            event_slug (str | Unset):
            event_title (str | Unset):
            outcome (PmPositionOutcome | Unset):
            side (PmPositionSide | Unset): Which side of the binary outcome the position backs.
            fill_basis (str | Unset):
            entry_probability (float | Unset):
            entry_prob_sum (float | Unset):
            stake_musd (float | Unset):
            shares_musd (float | Unset):
            max_payout (float | Unset): equals sharesMusd
            shape (str | Unset):
            markets_count (int | None | Unset): True total markets on the event (stored value); may exceed the
                number of hydrated/snapshot outcomes for capped multi-outcome books.
                null when unknown.
            entry_outcomes_snapshot (list[Any] | None | PmPositionEntryOutcomesSnapshotType0 | Unset): Snapshot of the
                event's outcomes (names + probabilities) frozen at
                entry — the basis the position was priced against.
            freshness_at_entry (Freshness | Unset): Data-freshness descriptor. Futures + spot use ageSeconds; PM uses
                ageMinutes. `status` is a freshness label; `basis` (PM only) names which
                timestamp the age was measured against.
            event_status_at_entry (None | str | Unset): The event's status (e.g. open/closed) when the position opened.
            settlement_state (None | str | Unset):
            void_reason (None | str | Unset): Why a position was voided and refunded (status void_refunded) —
                null for normal settlements.
            payout_musd (float | None | Unset):
            pnl_musd (float | None | Unset):
            opened_at (datetime.datetime | None | Unset):
            settled_at (datetime.datetime | None | Unset):
            created_at (datetime.datetime | Unset):
            current_probability (float | None | Unset): list endpoint, open only; 0..100
            unrealized_mark (float | None | Unset):
            unrealized_pnl (float | None | Unset):
    """

    id: int | Unset = UNSET
    status: str | Unset = UNSET
    source: str | Unset = UNSET
    event_slug: str | Unset = UNSET
    event_title: str | Unset = UNSET
    outcome: PmPositionOutcome | Unset = UNSET
    side: PmPositionSide | Unset = UNSET
    fill_basis: str | Unset = UNSET
    entry_probability: float | Unset = UNSET
    entry_prob_sum: float | Unset = UNSET
    stake_musd: float | Unset = UNSET
    shares_musd: float | Unset = UNSET
    max_payout: float | Unset = UNSET
    shape: str | Unset = UNSET
    markets_count: int | None | Unset = UNSET
    entry_outcomes_snapshot: list[Any] | None | PmPositionEntryOutcomesSnapshotType0 | Unset = UNSET
    freshness_at_entry: Freshness | Unset = UNSET
    event_status_at_entry: None | str | Unset = UNSET
    settlement_state: None | str | Unset = UNSET
    void_reason: None | str | Unset = UNSET
    payout_musd: float | None | Unset = UNSET
    pnl_musd: float | None | Unset = UNSET
    opened_at: datetime.datetime | None | Unset = UNSET
    settled_at: datetime.datetime | None | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    current_probability: float | None | Unset = UNSET
    unrealized_mark: float | None | Unset = UNSET
    unrealized_pnl: float | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.pm_position_entry_outcomes_snapshot_type_0 import PmPositionEntryOutcomesSnapshotType0

        id = self.id

        status = self.status

        source = self.source

        event_slug = self.event_slug

        event_title = self.event_title

        outcome: dict[str, Any] | Unset = UNSET
        if not isinstance(self.outcome, Unset):
            outcome = self.outcome.to_dict()

        side: str | Unset = UNSET
        if not isinstance(self.side, Unset):
            side = self.side.value

        fill_basis = self.fill_basis

        entry_probability = self.entry_probability

        entry_prob_sum = self.entry_prob_sum

        stake_musd = self.stake_musd

        shares_musd = self.shares_musd

        max_payout = self.max_payout

        shape = self.shape

        markets_count: int | None | Unset
        if isinstance(self.markets_count, Unset):
            markets_count = UNSET
        else:
            markets_count = self.markets_count

        entry_outcomes_snapshot: dict[str, Any] | list[Any] | None | Unset
        if isinstance(self.entry_outcomes_snapshot, Unset):
            entry_outcomes_snapshot = UNSET
        elif isinstance(self.entry_outcomes_snapshot, PmPositionEntryOutcomesSnapshotType0):
            entry_outcomes_snapshot = self.entry_outcomes_snapshot.to_dict()
        elif isinstance(self.entry_outcomes_snapshot, list):
            entry_outcomes_snapshot = self.entry_outcomes_snapshot

        else:
            entry_outcomes_snapshot = self.entry_outcomes_snapshot

        freshness_at_entry: dict[str, Any] | Unset = UNSET
        if not isinstance(self.freshness_at_entry, Unset):
            freshness_at_entry = self.freshness_at_entry.to_dict()

        event_status_at_entry: None | str | Unset
        if isinstance(self.event_status_at_entry, Unset):
            event_status_at_entry = UNSET
        else:
            event_status_at_entry = self.event_status_at_entry

        settlement_state: None | str | Unset
        if isinstance(self.settlement_state, Unset):
            settlement_state = UNSET
        else:
            settlement_state = self.settlement_state

        void_reason: None | str | Unset
        if isinstance(self.void_reason, Unset):
            void_reason = UNSET
        else:
            void_reason = self.void_reason

        payout_musd: float | None | Unset
        if isinstance(self.payout_musd, Unset):
            payout_musd = UNSET
        else:
            payout_musd = self.payout_musd

        pnl_musd: float | None | Unset
        if isinstance(self.pnl_musd, Unset):
            pnl_musd = UNSET
        else:
            pnl_musd = self.pnl_musd

        opened_at: None | str | Unset
        if isinstance(self.opened_at, Unset):
            opened_at = UNSET
        elif isinstance(self.opened_at, datetime.datetime):
            opened_at = self.opened_at.isoformat()
        else:
            opened_at = self.opened_at

        settled_at: None | str | Unset
        if isinstance(self.settled_at, Unset):
            settled_at = UNSET
        elif isinstance(self.settled_at, datetime.datetime):
            settled_at = self.settled_at.isoformat()
        else:
            settled_at = self.settled_at

        created_at: str | Unset = UNSET
        if not isinstance(self.created_at, Unset):
            created_at = self.created_at.isoformat()

        current_probability: float | None | Unset
        if isinstance(self.current_probability, Unset):
            current_probability = UNSET
        else:
            current_probability = self.current_probability

        unrealized_mark: float | None | Unset
        if isinstance(self.unrealized_mark, Unset):
            unrealized_mark = UNSET
        else:
            unrealized_mark = self.unrealized_mark

        unrealized_pnl: float | None | Unset
        if isinstance(self.unrealized_pnl, Unset):
            unrealized_pnl = UNSET
        else:
            unrealized_pnl = self.unrealized_pnl

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if id is not UNSET:
            field_dict["id"] = id
        if status is not UNSET:
            field_dict["status"] = status
        if source is not UNSET:
            field_dict["source"] = source
        if event_slug is not UNSET:
            field_dict["eventSlug"] = event_slug
        if event_title is not UNSET:
            field_dict["eventTitle"] = event_title
        if outcome is not UNSET:
            field_dict["outcome"] = outcome
        if side is not UNSET:
            field_dict["side"] = side
        if fill_basis is not UNSET:
            field_dict["fillBasis"] = fill_basis
        if entry_probability is not UNSET:
            field_dict["entryProbability"] = entry_probability
        if entry_prob_sum is not UNSET:
            field_dict["entryProbSum"] = entry_prob_sum
        if stake_musd is not UNSET:
            field_dict["stakeMusd"] = stake_musd
        if shares_musd is not UNSET:
            field_dict["sharesMusd"] = shares_musd
        if max_payout is not UNSET:
            field_dict["maxPayout"] = max_payout
        if shape is not UNSET:
            field_dict["shape"] = shape
        if markets_count is not UNSET:
            field_dict["marketsCount"] = markets_count
        if entry_outcomes_snapshot is not UNSET:
            field_dict["entryOutcomesSnapshot"] = entry_outcomes_snapshot
        if freshness_at_entry is not UNSET:
            field_dict["freshnessAtEntry"] = freshness_at_entry
        if event_status_at_entry is not UNSET:
            field_dict["eventStatusAtEntry"] = event_status_at_entry
        if settlement_state is not UNSET:
            field_dict["settlementState"] = settlement_state
        if void_reason is not UNSET:
            field_dict["voidReason"] = void_reason
        if payout_musd is not UNSET:
            field_dict["payoutMusd"] = payout_musd
        if pnl_musd is not UNSET:
            field_dict["pnlMusd"] = pnl_musd
        if opened_at is not UNSET:
            field_dict["openedAt"] = opened_at
        if settled_at is not UNSET:
            field_dict["settledAt"] = settled_at
        if created_at is not UNSET:
            field_dict["createdAt"] = created_at
        if current_probability is not UNSET:
            field_dict["currentProbability"] = current_probability
        if unrealized_mark is not UNSET:
            field_dict["unrealizedMark"] = unrealized_mark
        if unrealized_pnl is not UNSET:
            field_dict["unrealizedPnl"] = unrealized_pnl

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.freshness import Freshness
        from ..models.pm_position_entry_outcomes_snapshot_type_0 import PmPositionEntryOutcomesSnapshotType0
        from ..models.pm_position_outcome import PmPositionOutcome

        d = dict(src_dict)
        id = d.pop("id", UNSET)

        status = d.pop("status", UNSET)

        source = d.pop("source", UNSET)

        event_slug = d.pop("eventSlug", UNSET)

        event_title = d.pop("eventTitle", UNSET)

        _outcome = d.pop("outcome", UNSET)
        outcome: PmPositionOutcome | Unset
        if isinstance(_outcome, Unset):
            outcome = UNSET
        else:
            outcome = PmPositionOutcome.from_dict(_outcome)

        _side = d.pop("side", UNSET)
        side: PmPositionSide | Unset
        if isinstance(_side, Unset):
            side = UNSET
        else:
            side = PmPositionSide(_side)

        fill_basis = d.pop("fillBasis", UNSET)

        entry_probability = d.pop("entryProbability", UNSET)

        entry_prob_sum = d.pop("entryProbSum", UNSET)

        stake_musd = d.pop("stakeMusd", UNSET)

        shares_musd = d.pop("sharesMusd", UNSET)

        max_payout = d.pop("maxPayout", UNSET)

        shape = d.pop("shape", UNSET)

        def _parse_markets_count(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        markets_count = _parse_markets_count(d.pop("marketsCount", UNSET))

        def _parse_entry_outcomes_snapshot(
            data: object,
        ) -> list[Any] | None | PmPositionEntryOutcomesSnapshotType0 | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                entry_outcomes_snapshot_type_0 = PmPositionEntryOutcomesSnapshotType0.from_dict(data)

                return entry_outcomes_snapshot_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, list):
                    raise TypeError()
                entry_outcomes_snapshot_type_1 = cast(list[Any], data)

                return entry_outcomes_snapshot_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[Any] | None | PmPositionEntryOutcomesSnapshotType0 | Unset, data)

        entry_outcomes_snapshot = _parse_entry_outcomes_snapshot(d.pop("entryOutcomesSnapshot", UNSET))

        _freshness_at_entry = d.pop("freshnessAtEntry", UNSET)
        freshness_at_entry: Freshness | Unset
        if isinstance(_freshness_at_entry, Unset):
            freshness_at_entry = UNSET
        else:
            freshness_at_entry = Freshness.from_dict(_freshness_at_entry)

        def _parse_event_status_at_entry(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        event_status_at_entry = _parse_event_status_at_entry(d.pop("eventStatusAtEntry", UNSET))

        def _parse_settlement_state(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        settlement_state = _parse_settlement_state(d.pop("settlementState", UNSET))

        def _parse_void_reason(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        void_reason = _parse_void_reason(d.pop("voidReason", UNSET))

        def _parse_payout_musd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        payout_musd = _parse_payout_musd(d.pop("payoutMusd", UNSET))

        def _parse_pnl_musd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        pnl_musd = _parse_pnl_musd(d.pop("pnlMusd", UNSET))

        def _parse_opened_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                opened_at_type_0 = datetime.datetime.fromisoformat(data)

                return opened_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        opened_at = _parse_opened_at(d.pop("openedAt", UNSET))

        def _parse_settled_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                settled_at_type_0 = datetime.datetime.fromisoformat(data)

                return settled_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        settled_at = _parse_settled_at(d.pop("settledAt", UNSET))

        _created_at = d.pop("createdAt", UNSET)
        created_at: datetime.datetime | Unset
        if isinstance(_created_at, Unset):
            created_at = UNSET
        else:
            created_at = datetime.datetime.fromisoformat(_created_at)

        def _parse_current_probability(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        current_probability = _parse_current_probability(d.pop("currentProbability", UNSET))

        def _parse_unrealized_mark(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        unrealized_mark = _parse_unrealized_mark(d.pop("unrealizedMark", UNSET))

        def _parse_unrealized_pnl(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        unrealized_pnl = _parse_unrealized_pnl(d.pop("unrealizedPnl", UNSET))

        pm_position = cls(
            id=id,
            status=status,
            source=source,
            event_slug=event_slug,
            event_title=event_title,
            outcome=outcome,
            side=side,
            fill_basis=fill_basis,
            entry_probability=entry_probability,
            entry_prob_sum=entry_prob_sum,
            stake_musd=stake_musd,
            shares_musd=shares_musd,
            max_payout=max_payout,
            shape=shape,
            markets_count=markets_count,
            entry_outcomes_snapshot=entry_outcomes_snapshot,
            freshness_at_entry=freshness_at_entry,
            event_status_at_entry=event_status_at_entry,
            settlement_state=settlement_state,
            void_reason=void_reason,
            payout_musd=payout_musd,
            pnl_musd=pnl_musd,
            opened_at=opened_at,
            settled_at=settled_at,
            created_at=created_at,
            current_probability=current_probability,
            unrealized_mark=unrealized_mark,
            unrealized_pnl=unrealized_pnl,
        )

        pm_position.additional_properties = d
        return pm_position

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
