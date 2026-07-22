from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.spot_order_request_order_type import SpotOrderRequestOrderType
from ..models.spot_order_request_side import SpotOrderRequestSide
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.agent_trace_metadata import AgentTraceMetadata





T = TypeVar("T", bound="SpotOrderRequest")



@_attrs_define
class SpotOrderRequest:
    """ 
        Attributes:
            coin_id (str): Coin UCID (e.g. "1" = BTC). NOT a ticker symbol.
            side (SpotOrderRequestSide):
            order_type (SpotOrderRequestOrderType):
            quantity (float): Amount of the base coin (must be > 0).
            idempotency_key (str): REQUIRED for API-key (agent) callers. Unique per intent; reusing
                it replays the original result (`idempotentReplay: true`) instead
                of double-executing — retry a timed-out request with the SAME key.
            limit_price (float | Unset): Required for limit/stop orders (USD per coin).
            stop_price (float | Unset): Required for stop orders (USD trigger price).
            agent_trace (AgentTraceMetadata | Unset): Optional private trace metadata supplied by a user-run agent.
                CoinRithm
                stores only this structured summary; do not send chain-of-thought,
                secrets, emails, or private account identity.
     """

    coin_id: str
    side: SpotOrderRequestSide
    order_type: SpotOrderRequestOrderType
    quantity: float
    idempotency_key: str
    limit_price: float | Unset = UNSET
    stop_price: float | Unset = UNSET
    agent_trace: AgentTraceMetadata | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.agent_trace_metadata import AgentTraceMetadata
        coin_id = self.coin_id

        side = self.side.value

        order_type = self.order_type.value

        quantity = self.quantity

        idempotency_key = self.idempotency_key

        limit_price = self.limit_price

        stop_price = self.stop_price

        agent_trace: dict[str, Any] | Unset = UNSET
        if not isinstance(self.agent_trace, Unset):
            agent_trace = self.agent_trace.to_dict()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "coinId": coin_id,
            "side": side,
            "orderType": order_type,
            "quantity": quantity,
            "idempotencyKey": idempotency_key,
        })
        if limit_price is not UNSET:
            field_dict["limitPrice"] = limit_price
        if stop_price is not UNSET:
            field_dict["stopPrice"] = stop_price
        if agent_trace is not UNSET:
            field_dict["agentTrace"] = agent_trace

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_trace_metadata import AgentTraceMetadata
        d = dict(src_dict)
        coin_id = d.pop("coinId")

        side = SpotOrderRequestSide(d.pop("side"))




        order_type = SpotOrderRequestOrderType(d.pop("orderType"))




        quantity = d.pop("quantity")

        idempotency_key = d.pop("idempotencyKey")

        limit_price = d.pop("limitPrice", UNSET)

        stop_price = d.pop("stopPrice", UNSET)

        _agent_trace = d.pop("agentTrace", UNSET)
        agent_trace: AgentTraceMetadata | Unset
        if isinstance(_agent_trace,  Unset):
            agent_trace = UNSET
        else:
            agent_trace = AgentTraceMetadata.from_dict(_agent_trace)




        spot_order_request = cls(
            coin_id=coin_id,
            side=side,
            order_type=order_type,
            quantity=quantity,
            idempotency_key=idempotency_key,
            limit_price=limit_price,
            stop_price=stop_price,
            agent_trace=agent_trace,
        )


        spot_order_request.additional_properties = d
        return spot_order_request

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
