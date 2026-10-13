from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..models.public_pm_whales_response_min_usd import PublicPmWhalesResponseMinUsd
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_whale_stats_24h import PublicPmWhaleStats24H
    from ..models.public_pm_whale_trade import PublicPmWhaleTrade
    from ..models.public_pm_whales_response_coverage_item import PublicPmWhalesResponseCoverageItem


T = TypeVar("T", bound="PublicPmWhalesResponse")


@_attrs_define
class PublicPmWhalesResponse:
    """
    Attributes:
        trades (list[PublicPmWhaleTrade]):
        coverage (list[PublicPmWhalesResponseCoverageItem]):
        min_usd (PublicPmWhalesResponseMinUsd | Unset): The size tier applied; present only when `minUsd` was requested.
        stats24h (PublicPmWhaleStats24H | Unset): Trailing 24-hour aggregates over the full verified whale table, not
            only the 50-row tape.
    """

    trades: list[PublicPmWhaleTrade]
    coverage: list[PublicPmWhalesResponseCoverageItem]
    min_usd: PublicPmWhalesResponseMinUsd | Unset = UNSET
    stats24h: PublicPmWhaleStats24H | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        trades = []
        for trades_item_data in self.trades:
            trades_item = trades_item_data.to_dict()
            trades.append(trades_item)

        coverage = []
        for coverage_item_data in self.coverage:
            coverage_item = coverage_item_data.to_dict()
            coverage.append(coverage_item)

        min_usd: int | Unset = UNSET
        if not isinstance(self.min_usd, Unset):
            min_usd = self.min_usd.value

        stats24h: dict[str, Any] | Unset = UNSET
        if not isinstance(self.stats24h, Unset):
            stats24h = self.stats24h.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "trades": trades,
                "coverage": coverage,
            }
        )
        if min_usd is not UNSET:
            field_dict["minUsd"] = min_usd
        if stats24h is not UNSET:
            field_dict["stats24h"] = stats24h

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_whale_stats_24h import PublicPmWhaleStats24H
        from ..models.public_pm_whale_trade import PublicPmWhaleTrade
        from ..models.public_pm_whales_response_coverage_item import PublicPmWhalesResponseCoverageItem

        d = dict(src_dict)
        trades = []
        _trades = d.pop("trades")
        for trades_item_data in _trades:
            trades_item = PublicPmWhaleTrade.from_dict(trades_item_data)

            trades.append(trades_item)

        coverage = []
        _coverage = d.pop("coverage")
        for coverage_item_data in _coverage:
            coverage_item = PublicPmWhalesResponseCoverageItem.from_dict(coverage_item_data)

            coverage.append(coverage_item)

        _min_usd = d.pop("minUsd", UNSET)
        min_usd: PublicPmWhalesResponseMinUsd | Unset
        if isinstance(_min_usd, Unset):
            min_usd = UNSET
        else:
            min_usd = PublicPmWhalesResponseMinUsd(_min_usd)

        _stats24h = d.pop("stats24h", UNSET)
        stats24h: PublicPmWhaleStats24H | Unset
        if isinstance(_stats24h, Unset):
            stats24h = UNSET
        else:
            stats24h = PublicPmWhaleStats24H.from_dict(_stats24h)

        public_pm_whales_response = cls(
            trades=trades,
            coverage=coverage,
            min_usd=min_usd,
            stats24h=stats24h,
        )

        return public_pm_whales_response
