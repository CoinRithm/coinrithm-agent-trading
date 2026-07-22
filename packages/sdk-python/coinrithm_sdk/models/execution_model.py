from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast






T = TypeVar("T", bound="ExecutionModel")



@_attrs_define
class ExecutionModel:
    """ Paper Execution Realism v1 cost disclosure. Paper fills apply a
    deterministic, fully-disclosed cost so simulated PnL reflects real
    trading friction (a flat round-trip is a small loss, not a free
    breakeven). This is a rehearsal cost model, NOT an exchange fill
    guarantee. Per venue:
      - spot/futures: a taker fee (`feeBps`) on notional, folded into
        realized PnL. Spot market orders also fill at an adverse price
        (half-spread + slippage); futures entry/exit spread/slippage is
        not modeled in v1.
      - PM: fills at the ask (mid + half the ingested bid-ask spread) with
        size/liquidity-based slippage and a Polymarket-shaped taker fee
        (~1.8% near 50%, ~0 at the extremes), folded into `sharesMusd`.
        `feeBps`/`spreadBps` are positive and `slippageBps` scales with
        order size; `entryProbability` stays the mid for calibration.
    Funding rates, order-book depth, latency, and market impact are not
    modeled.

        Attributes:
            version (str | Unset):
            fee_bps (float | Unset): taker fee, basis points of notional
            spread_bps (float | Unset): modeled bid/ask spread (bps)
            slippage_bps (float | Unset): modeled slippage (bps)
            estimated_fee_musd (float | Unset): estimated fee for this trade (mUSD)
            estimated_slippage_musd (float | Unset): estimated slippage cost for this trade (mUSD)
            funding_mode (str | Unset):
            assumptions (list[str] | Unset): human-readable list of what is and isn't modeled
     """

    version: str | Unset = UNSET
    fee_bps: float | Unset = UNSET
    spread_bps: float | Unset = UNSET
    slippage_bps: float | Unset = UNSET
    estimated_fee_musd: float | Unset = UNSET
    estimated_slippage_musd: float | Unset = UNSET
    funding_mode: str | Unset = UNSET
    assumptions: list[str] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        version = self.version

        fee_bps = self.fee_bps

        spread_bps = self.spread_bps

        slippage_bps = self.slippage_bps

        estimated_fee_musd = self.estimated_fee_musd

        estimated_slippage_musd = self.estimated_slippage_musd

        funding_mode = self.funding_mode

        assumptions: list[str] | Unset = UNSET
        if not isinstance(self.assumptions, Unset):
            assumptions = self.assumptions




        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if version is not UNSET:
            field_dict["version"] = version
        if fee_bps is not UNSET:
            field_dict["feeBps"] = fee_bps
        if spread_bps is not UNSET:
            field_dict["spreadBps"] = spread_bps
        if slippage_bps is not UNSET:
            field_dict["slippageBps"] = slippage_bps
        if estimated_fee_musd is not UNSET:
            field_dict["estimatedFeeMusd"] = estimated_fee_musd
        if estimated_slippage_musd is not UNSET:
            field_dict["estimatedSlippageMusd"] = estimated_slippage_musd
        if funding_mode is not UNSET:
            field_dict["fundingMode"] = funding_mode
        if assumptions is not UNSET:
            field_dict["assumptions"] = assumptions

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        version = d.pop("version", UNSET)

        fee_bps = d.pop("feeBps", UNSET)

        spread_bps = d.pop("spreadBps", UNSET)

        slippage_bps = d.pop("slippageBps", UNSET)

        estimated_fee_musd = d.pop("estimatedFeeMusd", UNSET)

        estimated_slippage_musd = d.pop("estimatedSlippageMusd", UNSET)

        funding_mode = d.pop("fundingMode", UNSET)

        assumptions = cast(list[str], d.pop("assumptions", UNSET))


        execution_model = cls(
            version=version,
            fee_bps=fee_bps,
            spread_bps=spread_bps,
            slippage_bps=slippage_bps,
            estimated_fee_musd=estimated_fee_musd,
            estimated_slippage_musd=estimated_slippage_musd,
            funding_mode=funding_mode,
            assumptions=assumptions,
        )


        execution_model.additional_properties = d
        return execution_model

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
