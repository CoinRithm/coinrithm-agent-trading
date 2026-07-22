from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.public_pm_whale_trade import PublicPmWhaleTrade
  from ..models.public_pm_whales_response_coverage_item import PublicPmWhalesResponseCoverageItem
  from ..models.public_pm_whales_response_stats_24h import PublicPmWhalesResponseStats24H





T = TypeVar("T", bound="PublicPmWhalesResponse")



@_attrs_define
class PublicPmWhalesResponse:
    """ 
        Attributes:
            trades (list[PublicPmWhaleTrade]):
            coverage (list[PublicPmWhalesResponseCoverageItem]):
            stats24h (PublicPmWhalesResponseStats24H | Unset):
     """

    trades: list[PublicPmWhaleTrade]
    coverage: list[PublicPmWhalesResponseCoverageItem]
    stats24h: PublicPmWhalesResponseStats24H | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.public_pm_whale_trade import PublicPmWhaleTrade
        from ..models.public_pm_whales_response_coverage_item import PublicPmWhalesResponseCoverageItem
        from ..models.public_pm_whales_response_stats_24h import PublicPmWhalesResponseStats24H
        trades = []
        for trades_item_data in self.trades:
            trades_item = trades_item_data.to_dict()
            trades.append(trades_item)



        coverage = []
        for coverage_item_data in self.coverage:
            coverage_item = coverage_item_data.to_dict()
            coverage.append(coverage_item)



        stats24h: dict[str, Any] | Unset = UNSET
        if not isinstance(self.stats24h, Unset):
            stats24h = self.stats24h.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "trades": trades,
            "coverage": coverage,
        })
        if stats24h is not UNSET:
            field_dict["stats24h"] = stats24h

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_whale_trade import PublicPmWhaleTrade
        from ..models.public_pm_whales_response_coverage_item import PublicPmWhalesResponseCoverageItem
        from ..models.public_pm_whales_response_stats_24h import PublicPmWhalesResponseStats24H
        d = dict(src_dict)
        trades = []
        _trades = d.pop("trades")
        for trades_item_data in (_trades):
            trades_item = PublicPmWhaleTrade.from_dict(trades_item_data)



            trades.append(trades_item)


        coverage = []
        _coverage = d.pop("coverage")
        for coverage_item_data in (_coverage):
            coverage_item = PublicPmWhalesResponseCoverageItem.from_dict(coverage_item_data)



            coverage.append(coverage_item)


        _stats24h = d.pop("stats24h", UNSET)
        stats24h: PublicPmWhalesResponseStats24H | Unset
        if isinstance(_stats24h,  Unset):
            stats24h = UNSET
        else:
            stats24h = PublicPmWhalesResponseStats24H.from_dict(_stats24h)




        public_pm_whales_response = cls(
            trades=trades,
            coverage=coverage,
            stats24h=stats24h,
        )

        return public_pm_whales_response

