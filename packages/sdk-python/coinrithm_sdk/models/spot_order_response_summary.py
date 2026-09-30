from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.spot_order_response_summary_execution_model_status import SpotOrderResponseSummaryExecutionModelStatus
from ..types import UNSET, Unset

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
        pnl (float | None | Unset): market only; realized PnL in USD, net of fee. null on buys
        fee_usd (float | None | Unset): market only; taker fee charged on this fill
        slippage_usd (float | None | Unset): market only; modeled slippage cost
        execution_model (ExecutionModel | None | Unset): Market only. null on an idempotent replay: the fill's
            historical model parameters are not retained (see
            `executionModelStatus`).
        execution_model_status (SpotOrderResponseSummaryExecutionModelStatus | Unset): Market idempotent replay only.
        execution_version (None | str | Unset): Market idempotent replay only. The fill's execution version,
            e.g. "paper_execution_v1"; null for a pre-realism fill.
        limit_price (float | Unset): limit/stop only
        order_type (str | Unset): limit/stop only
    """

    side: str | Unset = UNSET
    quantity: float | Unset = UNSET
    execution_price: float | Unset = UNSET
    total_cost: float | Unset = UNSET
    pnl: float | None | Unset = UNSET
    fee_usd: float | None | Unset = UNSET
    slippage_usd: float | None | Unset = UNSET
    execution_model: ExecutionModel | None | Unset = UNSET
    execution_model_status: SpotOrderResponseSummaryExecutionModelStatus | Unset = UNSET
    execution_version: None | str | Unset = UNSET
    limit_price: float | Unset = UNSET
    order_type: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.execution_model import ExecutionModel

        side = self.side

        quantity = self.quantity

        execution_price = self.execution_price

        total_cost = self.total_cost

        pnl: float | None | Unset
        if isinstance(self.pnl, Unset):
            pnl = UNSET
        else:
            pnl = self.pnl

        fee_usd: float | None | Unset
        if isinstance(self.fee_usd, Unset):
            fee_usd = UNSET
        else:
            fee_usd = self.fee_usd

        slippage_usd: float | None | Unset
        if isinstance(self.slippage_usd, Unset):
            slippage_usd = UNSET
        else:
            slippage_usd = self.slippage_usd

        execution_model: dict[str, Any] | None | Unset
        if isinstance(self.execution_model, Unset):
            execution_model = UNSET
        elif isinstance(self.execution_model, ExecutionModel):
            execution_model = self.execution_model.to_dict()
        else:
            execution_model = self.execution_model

        execution_model_status: str | Unset = UNSET
        if not isinstance(self.execution_model_status, Unset):
            execution_model_status = self.execution_model_status.value

        execution_version: None | str | Unset
        if isinstance(self.execution_version, Unset):
            execution_version = UNSET
        else:
            execution_version = self.execution_version

        limit_price = self.limit_price

        order_type = self.order_type

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
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
        if execution_model_status is not UNSET:
            field_dict["executionModelStatus"] = execution_model_status
        if execution_version is not UNSET:
            field_dict["executionVersion"] = execution_version
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

        def _parse_pnl(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        pnl = _parse_pnl(d.pop("pnl", UNSET))

        def _parse_fee_usd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        fee_usd = _parse_fee_usd(d.pop("feeUsd", UNSET))

        def _parse_slippage_usd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        slippage_usd = _parse_slippage_usd(d.pop("slippageUsd", UNSET))

        def _parse_execution_model(data: object) -> ExecutionModel | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                execution_model_type_0 = ExecutionModel.from_dict(data)

                return execution_model_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(ExecutionModel | None | Unset, data)

        execution_model = _parse_execution_model(d.pop("executionModel", UNSET))

        _execution_model_status = d.pop("executionModelStatus", UNSET)
        execution_model_status: SpotOrderResponseSummaryExecutionModelStatus | Unset
        if isinstance(_execution_model_status, Unset):
            execution_model_status = UNSET
        else:
            execution_model_status = SpotOrderResponseSummaryExecutionModelStatus(_execution_model_status)

        def _parse_execution_version(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        execution_version = _parse_execution_version(d.pop("executionVersion", UNSET))

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
            execution_model_status=execution_model_status,
            execution_version=execution_version,
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
