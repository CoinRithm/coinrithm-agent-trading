from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.execution_model import ExecutionModel





T = TypeVar("T", bound="SpotOrderResponseSummary")



@_attrs_define
class SpotOrderResponseSummary:
    """ 
        Attributes:
            side (str | Unset):
            quantity (float | Unset):
            execution_price (float | Unset): market only; fill price after spread+slippage
            total_cost (float | Unset): market only
            pnl (float | Unset): market only; realized PnL in USD, net of fee
            fee_usd (float | Unset): market only; taker fee charged on this fill
            slippage_usd (float | Unset): market only; modeled slippage cost
            execution_model (ExecutionModel | Unset): Paper Execution Realism v1 cost disclosure. Paper fills apply a
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
            limit_price (float | Unset): limit/stop only
            order_type (str | Unset): limit/stop only
     """

    side: str | Unset = UNSET
    quantity: float | Unset = UNSET
    execution_price: float | Unset = UNSET
    total_cost: float | Unset = UNSET
    pnl: float | Unset = UNSET
    fee_usd: float | Unset = UNSET
    slippage_usd: float | Unset = UNSET
    execution_model: ExecutionModel | Unset = UNSET
    limit_price: float | Unset = UNSET
    order_type: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.execution_model import ExecutionModel
        side = self.side

        quantity = self.quantity

        execution_price = self.execution_price

        total_cost = self.total_cost

        pnl = self.pnl

        fee_usd = self.fee_usd

        slippage_usd = self.slippage_usd

        execution_model: dict[str, Any] | Unset = UNSET
        if not isinstance(self.execution_model, Unset):
            execution_model = self.execution_model.to_dict()

        limit_price = self.limit_price

        order_type = self.order_type


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if side is not UNSET:
            field_dict["side"] = side
        if quantity is not UNSET:
            field_dict["quantity"] = quantity
        if execution_price is not UNSET:
            field_dict["executionPrice"] = execution_price
        if total_cost is not UNSET:
            field_dict["totalCost"] = total_cost
        if pnl is not UNSET:
            field_dict["pnl"] = pnl
        if fee_usd is not UNSET:
            field_dict["feeUsd"] = fee_usd
        if slippage_usd is not UNSET:
            field_dict["slippageUsd"] = slippage_usd
        if execution_model is not UNSET:
            field_dict["executionModel"] = execution_model
        if limit_price is not UNSET:
            field_dict["limitPrice"] = limit_price
        if order_type is not UNSET:
            field_dict["orderType"] = order_type

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.execution_model import ExecutionModel
        d = dict(src_dict)
        side = d.pop("side", UNSET)

        quantity = d.pop("quantity", UNSET)

        execution_price = d.pop("executionPrice", UNSET)

        total_cost = d.pop("totalCost", UNSET)

        pnl = d.pop("pnl", UNSET)

        fee_usd = d.pop("feeUsd", UNSET)

        slippage_usd = d.pop("slippageUsd", UNSET)

        _execution_model = d.pop("executionModel", UNSET)
        execution_model: ExecutionModel | Unset
        if isinstance(_execution_model,  Unset):
            execution_model = UNSET
        else:
            execution_model = ExecutionModel.from_dict(_execution_model)




        limit_price = d.pop("limitPrice", UNSET)

        order_type = d.pop("orderType", UNSET)

        spot_order_response_summary = cls(
            side=side,
            quantity=quantity,
            execution_price=execution_price,
            total_cost=total_cost,
            pnl=pnl,
            fee_usd=fee_usd,
            slippage_usd=slippage_usd,
            execution_model=execution_model,
            limit_price=limit_price,
            order_type=order_type,
        )


        spot_order_response_summary.additional_properties = d
        return spot_order_response_summary

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
