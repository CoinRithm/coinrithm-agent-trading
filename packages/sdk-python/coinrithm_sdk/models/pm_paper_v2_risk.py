from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PmPaperV2Risk")


@_attrs_define
class PmPaperV2Risk:
    """Unpaginated exact totals for the calling key's v2 positions; "today" is the UTC day.

    Attributes:
        as_of (datetime.datetime):
        day_key (datetime.date):
        total_open (int):
        open_reserved_cash_quanta_6 (str):
        opened_today (int):
        closed_today (int):
        realized_pnl_today_quanta_6 (str): Signed, settled positions only.
        accounting_complete (bool): False when any non-open position lacks a complete terminal record.
        legacy_exposure_present (bool): True when the key also holds v1 PM positions, frozen cash, or non-cash assets.
    """

    as_of: datetime.datetime
    day_key: datetime.date
    total_open: int
    open_reserved_cash_quanta_6: str
    opened_today: int
    closed_today: int
    realized_pnl_today_quanta_6: str
    accounting_complete: bool
    legacy_exposure_present: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        as_of = self.as_of.isoformat()

        day_key = self.day_key.isoformat()

        total_open = self.total_open

        open_reserved_cash_quanta_6 = self.open_reserved_cash_quanta_6

        opened_today = self.opened_today

        closed_today = self.closed_today

        realized_pnl_today_quanta_6 = self.realized_pnl_today_quanta_6

        accounting_complete = self.accounting_complete

        legacy_exposure_present = self.legacy_exposure_present

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "asOf": as_of,
                "dayKey": day_key,
                "totalOpen": total_open,
                "openReservedCashQuanta6": open_reserved_cash_quanta_6,
                "openedToday": opened_today,
                "closedToday": closed_today,
                "realizedPnlTodayQuanta6": realized_pnl_today_quanta_6,
                "accountingComplete": accounting_complete,
                "legacyExposurePresent": legacy_exposure_present,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        as_of = datetime.datetime.fromisoformat(d.pop("asOf").replace("Z", "+00:00"))

        day_key = datetime.date.fromisoformat(d.pop("dayKey"))

        total_open = d.pop("totalOpen")

        open_reserved_cash_quanta_6 = d.pop("openReservedCashQuanta6")

        opened_today = d.pop("openedToday")

        closed_today = d.pop("closedToday")

        realized_pnl_today_quanta_6 = d.pop("realizedPnlTodayQuanta6")

        accounting_complete = d.pop("accountingComplete")

        legacy_exposure_present = d.pop("legacyExposurePresent")

        pm_paper_v2_risk = cls(
            as_of=as_of,
            day_key=day_key,
            total_open=total_open,
            open_reserved_cash_quanta_6=open_reserved_cash_quanta_6,
            opened_today=opened_today,
            closed_today=closed_today,
            realized_pnl_today_quanta_6=realized_pnl_today_quanta_6,
            accounting_complete=accounting_complete,
            legacy_exposure_present=legacy_exposure_present,
        )

        pm_paper_v2_risk.additional_properties = d
        return pm_paper_v2_risk

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
