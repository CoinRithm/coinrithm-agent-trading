from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.spot_quote_request_side import SpotQuoteRequestSide
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.agent_trace_metadata import AgentTraceMetadata





T = TypeVar("T", bound="SpotQuoteRequest")



@_attrs_define
class SpotQuoteRequest:
    """ 
        Attributes:
            coin_id (str): Coin UCID (e.g. "1" = BTC). NOT a ticker symbol.
            side (SpotQuoteRequestSide):
            quantity (float): Amount of the base coin (> 0).
            agent_trace (AgentTraceMetadata | Unset): Optional private trace metadata supplied by a user-run agent.
                CoinRithm
                stores only this structured summary; do not send chain-of-thought,
                secrets, emails, or private account identity.
     """

    coin_id: str
    side: SpotQuoteRequestSide
    quantity: float
    agent_trace: AgentTraceMetadata | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.agent_trace_metadata import AgentTraceMetadata
        coin_id = self.coin_id

        side = self.side.value

        quantity = self.quantity

        agent_trace: dict[str, Any] | Unset = UNSET
        if not isinstance(self.agent_trace, Unset):
            agent_trace = self.agent_trace.to_dict()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "coinId": coin_id,
            "side": side,
            "quantity": quantity,
        })
        if agent_trace is not UNSET:
            field_dict["agentTrace"] = agent_trace

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_trace_metadata import AgentTraceMetadata
        d = dict(src_dict)
        coin_id = d.pop("coinId")

        side = SpotQuoteRequestSide(d.pop("side"))




        quantity = d.pop("quantity")

        _agent_trace = d.pop("agentTrace", UNSET)
        agent_trace: AgentTraceMetadata | Unset
        if isinstance(_agent_trace,  Unset):
            agent_trace = UNSET
        else:
            agent_trace = AgentTraceMetadata.from_dict(_agent_trace)




        spot_quote_request = cls(
            coin_id=coin_id,
            side=side,
            quantity=quantity,
            agent_trace=agent_trace,
        )


        spot_quote_request.additional_properties = d
        return spot_quote_request

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
