from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_paper_v2_position_accounting_status import PmPaperV2PositionAccountingStatus
from ..models.pm_paper_v2_position_side import PmPaperV2PositionSide
from ..models.pm_paper_v2_position_source import PmPaperV2PositionSource
from ..models.pm_paper_v2_position_status import PmPaperV2PositionStatus

if TYPE_CHECKING:
    from ..models.pm_paper_v2_position_entry import PmPaperV2PositionEntry
    from ..models.pm_paper_v2_position_exit_type_0 import PmPaperV2PositionExitType0
    from ..models.pm_paper_v2_position_terminal_type_0 import PmPaperV2PositionTerminalType0


T = TypeVar("T", bound="PmPaperV2Position")


@_attrs_define
class PmPaperV2Position:
    """
    Attributes:
        id (int):
        api_key_id (int):
        source (PmPaperV2PositionSource):
        slug (str):
        title (str):
        outcome_external_market_id (str):
        side (PmPaperV2PositionSide):
        status (PmPaperV2PositionStatus):
        opened_at (datetime.datetime):
        settled_at (datetime.datetime | None): Set only when accountingStatus is `settled`.
        accounting_status (PmPaperV2PositionAccountingStatus): pending = status is no longer open but the terminal
            record is not yet complete.
        quantity_units_2 (str): Shares x 100.
        reserved_cash_quanta_6 (str): Cash debited at entry, mUSD x 1,000,000.
        payout_quanta_6 (None | str): mUSD x 1,000,000; null until settled.
        pnl_quanta_6 (None | str): Signed, mUSD x 1,000,000; null until settled.
        entry (PmPaperV2PositionEntry):
        exit_ (None | PmPaperV2PositionExitType0): Latest exit intent; null when no close was requested.
        terminal (None | PmPaperV2PositionTerminalType0): Close or settlement evidence; null until accountingStatus is
            `settled`.
    """

    id: int
    api_key_id: int
    source: PmPaperV2PositionSource
    slug: str
    title: str
    outcome_external_market_id: str
    side: PmPaperV2PositionSide
    status: PmPaperV2PositionStatus
    opened_at: datetime.datetime
    settled_at: datetime.datetime | None
    accounting_status: PmPaperV2PositionAccountingStatus
    quantity_units_2: str
    reserved_cash_quanta_6: str
    payout_quanta_6: None | str
    pnl_quanta_6: None | str
    entry: PmPaperV2PositionEntry
    exit_: None | PmPaperV2PositionExitType0
    terminal: None | PmPaperV2PositionTerminalType0
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.pm_paper_v2_position_exit_type_0 import PmPaperV2PositionExitType0
        from ..models.pm_paper_v2_position_terminal_type_0 import PmPaperV2PositionTerminalType0

        id = self.id

        api_key_id = self.api_key_id

        source = self.source.value

        slug = self.slug

        title = self.title

        outcome_external_market_id = self.outcome_external_market_id

        side = self.side.value

        status = self.status.value

        opened_at = self.opened_at.isoformat()

        settled_at: None | str
        if isinstance(self.settled_at, datetime.datetime):
            settled_at = self.settled_at.isoformat()
        else:
            settled_at = self.settled_at

        accounting_status = self.accounting_status.value

        quantity_units_2 = self.quantity_units_2

        reserved_cash_quanta_6 = self.reserved_cash_quanta_6

        payout_quanta_6: None | str
        payout_quanta_6 = self.payout_quanta_6

        pnl_quanta_6: None | str
        pnl_quanta_6 = self.pnl_quanta_6

        entry = self.entry.to_dict()

        exit_: dict[str, Any] | None
        if isinstance(self.exit_, PmPaperV2PositionExitType0):
            exit_ = self.exit_.to_dict()
        else:
            exit_ = self.exit_

        terminal: dict[str, Any] | None
        if isinstance(self.terminal, PmPaperV2PositionTerminalType0):
            terminal = self.terminal.to_dict()
        else:
            terminal = self.terminal

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "apiKeyId": api_key_id,
                "source": source,
                "slug": slug,
                "title": title,
                "outcomeExternalMarketId": outcome_external_market_id,
                "side": side,
                "status": status,
                "openedAt": opened_at,
                "settledAt": settled_at,
                "accountingStatus": accounting_status,
                "quantityUnits2": quantity_units_2,
                "reservedCashQuanta6": reserved_cash_quanta_6,
                "payoutQuanta6": payout_quanta_6,
                "pnlQuanta6": pnl_quanta_6,
                "entry": entry,
                "exit": exit_,
                "terminal": terminal,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.pm_paper_v2_position_entry import PmPaperV2PositionEntry
        from ..models.pm_paper_v2_position_exit_type_0 import PmPaperV2PositionExitType0
        from ..models.pm_paper_v2_position_terminal_type_0 import PmPaperV2PositionTerminalType0

        d = dict(src_dict)
        id = d.pop("id")

        api_key_id = d.pop("apiKeyId")

        source = PmPaperV2PositionSource(d.pop("source"))

        slug = d.pop("slug")

        title = d.pop("title")

        outcome_external_market_id = d.pop("outcomeExternalMarketId")

        side = PmPaperV2PositionSide(d.pop("side"))

        status = PmPaperV2PositionStatus(d.pop("status"))

        opened_at = datetime.datetime.fromisoformat(d.pop("openedAt").replace("Z", "+00:00"))

        def _parse_settled_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                settled_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return settled_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        settled_at = _parse_settled_at(d.pop("settledAt"))

        accounting_status = PmPaperV2PositionAccountingStatus(d.pop("accountingStatus"))

        quantity_units_2 = d.pop("quantityUnits2")

        reserved_cash_quanta_6 = d.pop("reservedCashQuanta6")

        def _parse_payout_quanta_6(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        payout_quanta_6 = _parse_payout_quanta_6(d.pop("payoutQuanta6"))

        def _parse_pnl_quanta_6(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        pnl_quanta_6 = _parse_pnl_quanta_6(d.pop("pnlQuanta6"))

        entry = PmPaperV2PositionEntry.from_dict(d.pop("entry"))

        def _parse_exit_(data: object) -> None | PmPaperV2PositionExitType0:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                exit_type_0 = PmPaperV2PositionExitType0.from_dict(data)

                return exit_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PmPaperV2PositionExitType0, data)

        exit_ = _parse_exit_(d.pop("exit"))

        def _parse_terminal(data: object) -> None | PmPaperV2PositionTerminalType0:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                terminal_type_0 = PmPaperV2PositionTerminalType0.from_dict(data)

                return terminal_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PmPaperV2PositionTerminalType0, data)

        terminal = _parse_terminal(d.pop("terminal"))

        pm_paper_v2_position = cls(
            id=id,
            api_key_id=api_key_id,
            source=source,
            slug=slug,
            title=title,
            outcome_external_market_id=outcome_external_market_id,
            side=side,
            status=status,
            opened_at=opened_at,
            settled_at=settled_at,
            accounting_status=accounting_status,
            quantity_units_2=quantity_units_2,
            reserved_cash_quanta_6=reserved_cash_quanta_6,
            payout_quanta_6=payout_quanta_6,
            pnl_quanta_6=pnl_quanta_6,
            entry=entry,
            exit_=exit_,
            terminal=terminal,
        )

        pm_paper_v2_position.additional_properties = d
        return pm_paper_v2_position

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
