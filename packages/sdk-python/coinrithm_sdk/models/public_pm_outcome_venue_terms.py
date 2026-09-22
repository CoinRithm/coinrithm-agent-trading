from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

T = TypeVar("T", bound="PublicPmOutcomeVenueTerms")


@_attrs_define
class PublicPmOutcomeVenueTerms:
    """Venue-published order and settlement terms; null values mean unavailable, unreported, or invalid.

    Attributes:
        order_min_size (float | None): Polymarket minimum order size in shares.
        tick_size (float | None): Polymarket minimum probability increment as a ratio.
        fees_enabled (bool | None): Polymarket market fee flag.
        can_close_early (bool | None): Kalshi early-close capability.
        settlement_timer_seconds (int | None): Kalshi venue-published settlement timer in seconds; not a guaranteed
            deadline after close.
    """

    order_min_size: float | None
    tick_size: float | None
    fees_enabled: bool | None
    can_close_early: bool | None
    settlement_timer_seconds: int | None

    def to_dict(self) -> dict[str, Any]:
        order_min_size: float | None
        order_min_size = self.order_min_size

        tick_size: float | None
        tick_size = self.tick_size

        fees_enabled: bool | None
        fees_enabled = self.fees_enabled

        can_close_early: bool | None
        can_close_early = self.can_close_early

        settlement_timer_seconds: int | None
        settlement_timer_seconds = self.settlement_timer_seconds

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "orderMinSize": order_min_size,
                "tickSize": tick_size,
                "feesEnabled": fees_enabled,
                "canCloseEarly": can_close_early,
                "settlementTimerSeconds": settlement_timer_seconds,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_order_min_size(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        order_min_size = _parse_order_min_size(d.pop("orderMinSize"))

        def _parse_tick_size(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        tick_size = _parse_tick_size(d.pop("tickSize"))

        def _parse_fees_enabled(data: object) -> bool | None:
            if data is None:
                return data
            return cast(bool | None, data)

        fees_enabled = _parse_fees_enabled(d.pop("feesEnabled"))

        def _parse_can_close_early(data: object) -> bool | None:
            if data is None:
                return data
            return cast(bool | None, data)

        can_close_early = _parse_can_close_early(d.pop("canCloseEarly"))

        def _parse_settlement_timer_seconds(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        settlement_timer_seconds = _parse_settlement_timer_seconds(d.pop("settlementTimerSeconds"))

        public_pm_outcome_venue_terms = cls(
            order_min_size=order_min_size,
            tick_size=tick_size,
            fees_enabled=fees_enabled,
            can_close_early=can_close_early,
            settlement_timer_seconds=settlement_timer_seconds,
        )

        return public_pm_outcome_venue_terms
