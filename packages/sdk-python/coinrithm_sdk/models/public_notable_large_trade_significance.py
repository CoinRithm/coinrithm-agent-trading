from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicNotableLargeTradeSignificance")


@_attrs_define
class PublicNotableLargeTradeSignificance:
    """The largest print against its own market's distribution.

    Attributes:
        window_hours (float):
        symbol_trades (int): Prints of this venue and symbol in the window.
        p_50_usd (float | None):
        p_99_usd (float | None):
        p_999_usd (float | None):
        max_usd (float | None):
        multiple_of_p999 (float | None):
        is_largest_in_window (bool | None): Null only for a market newer than the cached distributions.
        rank_in_window (int | None): 1 + prints strictly larger in the window; null when not exact.
        threshold_usd (float): The bar this print cleared.
        basis (str): `p999` (the market's p99.9 or its class floor) or `smallHistory` (class-floor multiple and median
            multiple while history is short).
    """

    window_hours: float
    symbol_trades: int
    p_50_usd: float | None
    p_99_usd: float | None
    p_999_usd: float | None
    max_usd: float | None
    multiple_of_p999: float | None
    is_largest_in_window: bool | None
    rank_in_window: int | None
    threshold_usd: float
    basis: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        window_hours = self.window_hours

        symbol_trades = self.symbol_trades

        p_50_usd: float | None
        p_50_usd = self.p_50_usd

        p_99_usd: float | None
        p_99_usd = self.p_99_usd

        p_999_usd: float | None
        p_999_usd = self.p_999_usd

        max_usd: float | None
        max_usd = self.max_usd

        multiple_of_p999: float | None
        multiple_of_p999 = self.multiple_of_p999

        is_largest_in_window: bool | None
        is_largest_in_window = self.is_largest_in_window

        rank_in_window: int | None
        rank_in_window = self.rank_in_window

        threshold_usd = self.threshold_usd

        basis = self.basis

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "windowHours": window_hours,
                "symbolTrades": symbol_trades,
                "p50Usd": p_50_usd,
                "p99Usd": p_99_usd,
                "p999Usd": p_999_usd,
                "maxUsd": max_usd,
                "multipleOfP999": multiple_of_p999,
                "isLargestInWindow": is_largest_in_window,
                "rankInWindow": rank_in_window,
                "thresholdUsd": threshold_usd,
                "basis": basis,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        window_hours = d.pop("windowHours")

        symbol_trades = d.pop("symbolTrades")

        def _parse_p_50_usd(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        p_50_usd = _parse_p_50_usd(d.pop("p50Usd"))

        def _parse_p_99_usd(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        p_99_usd = _parse_p_99_usd(d.pop("p99Usd"))

        def _parse_p_999_usd(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        p_999_usd = _parse_p_999_usd(d.pop("p999Usd"))

        def _parse_max_usd(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        max_usd = _parse_max_usd(d.pop("maxUsd"))

        def _parse_multiple_of_p999(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        multiple_of_p999 = _parse_multiple_of_p999(d.pop("multipleOfP999"))

        def _parse_is_largest_in_window(data: object) -> bool | None:
            if data is None:
                return data
            return cast(bool | None, data)

        is_largest_in_window = _parse_is_largest_in_window(d.pop("isLargestInWindow"))

        def _parse_rank_in_window(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        rank_in_window = _parse_rank_in_window(d.pop("rankInWindow"))

        threshold_usd = d.pop("thresholdUsd")

        basis = d.pop("basis")

        public_notable_large_trade_significance = cls(
            window_hours=window_hours,
            symbol_trades=symbol_trades,
            p_50_usd=p_50_usd,
            p_99_usd=p_99_usd,
            p_999_usd=p_999_usd,
            max_usd=max_usd,
            multiple_of_p999=multiple_of_p999,
            is_largest_in_window=is_largest_in_window,
            rank_in_window=rank_in_window,
            threshold_usd=threshold_usd,
            basis=basis,
        )

        public_notable_large_trade_significance.additional_properties = d
        return public_notable_large_trade_significance

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
