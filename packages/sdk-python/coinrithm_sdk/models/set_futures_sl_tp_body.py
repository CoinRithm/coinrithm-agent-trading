from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_trace_metadata import AgentTraceMetadata


T = TypeVar("T", bound="SetFuturesSlTpBody")


@_attrs_define
class SetFuturesSlTpBody:
    """
    Attributes:
        position_id (int):
        stop_loss_price (float | None | Unset): Positive number sets; null clears; omit = unchanged.
        take_profit_price (float | None | Unset): Positive number sets; null clears; omit = unchanged.
        agent_trace (AgentTraceMetadata | Unset): Optional private trace metadata supplied by a user-run agent.
            CoinRithm
            stores only this structured summary; do not send chain-of-thought,
            secrets, emails, or private account identity.
    """

    position_id: int
    stop_loss_price: float | None | Unset = UNSET
    take_profit_price: float | None | Unset = UNSET
    agent_trace: AgentTraceMetadata | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        position_id = self.position_id

        stop_loss_price: float | None | Unset
        if isinstance(self.stop_loss_price, Unset):
            stop_loss_price = UNSET
        else:
            stop_loss_price = self.stop_loss_price

        take_profit_price: float | None | Unset
        if isinstance(self.take_profit_price, Unset):
            take_profit_price = UNSET
        else:
            take_profit_price = self.take_profit_price

        agent_trace: dict[str, Any] | Unset = UNSET
        if not isinstance(self.agent_trace, Unset):
            agent_trace = self.agent_trace.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "positionId": position_id,
            }
        )
        if stop_loss_price is not UNSET:
            field_dict["stopLossPrice"] = stop_loss_price
        if take_profit_price is not UNSET:
            field_dict["takeProfitPrice"] = take_profit_price
        if agent_trace is not UNSET:
            field_dict["agentTrace"] = agent_trace

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_trace_metadata import AgentTraceMetadata

        d = dict(src_dict)
        position_id = d.pop("positionId")

        def _parse_stop_loss_price(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        stop_loss_price = _parse_stop_loss_price(d.pop("stopLossPrice", UNSET))

        def _parse_take_profit_price(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        take_profit_price = _parse_take_profit_price(d.pop("takeProfitPrice", UNSET))

        _agent_trace = d.pop("agentTrace", UNSET)
        agent_trace: AgentTraceMetadata | Unset
        if isinstance(_agent_trace, Unset):
            agent_trace = UNSET
        else:
            agent_trace = AgentTraceMetadata.from_dict(_agent_trace)

        set_futures_sl_tp_body = cls(
            position_id=position_id,
            stop_loss_price=stop_loss_price,
            take_profit_price=take_profit_price,
            agent_trace=agent_trace,
        )

        set_futures_sl_tp_body.additional_properties = d
        return set_futures_sl_tp_body

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
