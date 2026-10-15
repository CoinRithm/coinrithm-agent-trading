from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_notable_large_trades_response_rules_class_floors_usd import (
        PublicNotableLargeTradesResponseRulesClassFloorsUsd,
    )
    from ..models.public_notable_large_trades_response_rules_small_history_multiple import (
        PublicNotableLargeTradesResponseRulesSmallHistoryMultiple,
    )


T = TypeVar("T", bound="PublicNotableLargeTradesResponseRules")


@_attrs_define
class PublicNotableLargeTradesResponseRules:
    """The selection rules in force.

    Attributes:
        candidate_hours (int | Unset): Candidate prints come from this recent window.
        stats_window_hours (float | Unset): Hours of history behind the distributions (up to 168).
        class_floors_usd (PublicNotableLargeTradesResponseRulesClassFloorsUsd | Unset): Minimum notional by class
            (`btcEth`, `crypto`, `commodity`, `index`, `equity`, `fx`).
        min_symbol_trades (int | Unset): Prints a market needs in the window before its p99.9 is used.
        small_history_multiple (PublicNotableLargeTradesResponseRulesSmallHistoryMultiple | Unset): Class-floor multiple
            for markets with less history.
        small_history_p50_multiple (float | Unset):
        burst_gap_seconds (int | Unset):
    """

    candidate_hours: int | Unset = UNSET
    stats_window_hours: float | Unset = UNSET
    class_floors_usd: PublicNotableLargeTradesResponseRulesClassFloorsUsd | Unset = UNSET
    min_symbol_trades: int | Unset = UNSET
    small_history_multiple: PublicNotableLargeTradesResponseRulesSmallHistoryMultiple | Unset = UNSET
    small_history_p50_multiple: float | Unset = UNSET
    burst_gap_seconds: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        candidate_hours = self.candidate_hours

        stats_window_hours = self.stats_window_hours

        class_floors_usd: dict[str, Any] | Unset = UNSET
        if not isinstance(self.class_floors_usd, Unset):
            class_floors_usd = self.class_floors_usd.to_dict()

        min_symbol_trades = self.min_symbol_trades

        small_history_multiple: dict[str, Any] | Unset = UNSET
        if not isinstance(self.small_history_multiple, Unset):
            small_history_multiple = self.small_history_multiple.to_dict()

        small_history_p50_multiple = self.small_history_p50_multiple

        burst_gap_seconds = self.burst_gap_seconds

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if candidate_hours is not UNSET:
            field_dict["candidateHours"] = candidate_hours
        if stats_window_hours is not UNSET:
            field_dict["statsWindowHours"] = stats_window_hours
        if class_floors_usd is not UNSET:
            field_dict["classFloorsUsd"] = class_floors_usd
        if min_symbol_trades is not UNSET:
            field_dict["minSymbolTrades"] = min_symbol_trades
        if small_history_multiple is not UNSET:
            field_dict["smallHistoryMultiple"] = small_history_multiple
        if small_history_p50_multiple is not UNSET:
            field_dict["smallHistoryP50Multiple"] = small_history_p50_multiple
        if burst_gap_seconds is not UNSET:
            field_dict["burstGapSeconds"] = burst_gap_seconds

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_notable_large_trades_response_rules_class_floors_usd import (
            PublicNotableLargeTradesResponseRulesClassFloorsUsd,
        )
        from ..models.public_notable_large_trades_response_rules_small_history_multiple import (
            PublicNotableLargeTradesResponseRulesSmallHistoryMultiple,
        )

        d = dict(src_dict)
        candidate_hours = d.pop("candidateHours", UNSET)

        stats_window_hours = d.pop("statsWindowHours", UNSET)

        _class_floors_usd = d.pop("classFloorsUsd", UNSET)
        class_floors_usd: PublicNotableLargeTradesResponseRulesClassFloorsUsd | Unset
        if isinstance(_class_floors_usd, Unset):
            class_floors_usd = UNSET
        else:
            class_floors_usd = PublicNotableLargeTradesResponseRulesClassFloorsUsd.from_dict(_class_floors_usd)

        min_symbol_trades = d.pop("minSymbolTrades", UNSET)

        _small_history_multiple = d.pop("smallHistoryMultiple", UNSET)
        small_history_multiple: PublicNotableLargeTradesResponseRulesSmallHistoryMultiple | Unset
        if isinstance(_small_history_multiple, Unset):
            small_history_multiple = UNSET
        else:
            small_history_multiple = PublicNotableLargeTradesResponseRulesSmallHistoryMultiple.from_dict(
                _small_history_multiple
            )

        small_history_p50_multiple = d.pop("smallHistoryP50Multiple", UNSET)

        burst_gap_seconds = d.pop("burstGapSeconds", UNSET)

        public_notable_large_trades_response_rules = cls(
            candidate_hours=candidate_hours,
            stats_window_hours=stats_window_hours,
            class_floors_usd=class_floors_usd,
            min_symbol_trades=min_symbol_trades,
            small_history_multiple=small_history_multiple,
            small_history_p50_multiple=small_history_p50_multiple,
            burst_gap_seconds=burst_gap_seconds,
        )

        public_notable_large_trades_response_rules.additional_properties = d
        return public_notable_large_trades_response_rules

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
