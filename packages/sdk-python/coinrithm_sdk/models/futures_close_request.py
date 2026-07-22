from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.agent_trace_metadata import AgentTraceMetadata





T = TypeVar("T", bound="FuturesCloseRequest")



@_attrs_define
class FuturesCloseRequest:
    """ 
        Attributes:
            position_id (int):
            idempotency_key (str):
            fraction (float | Unset): (0,1] portion to close. Omit or 1 = full close.
            agent_trace (AgentTraceMetadata | Unset): Optional private trace metadata supplied by a user-run agent.
                CoinRithm
                stores only this structured summary; do not send chain-of-thought,
                secrets, emails, or private account identity.
     """

    position_id: int
    idempotency_key: str
    fraction: float | Unset = UNSET
    agent_trace: AgentTraceMetadata | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.agent_trace_metadata import AgentTraceMetadata
        position_id = self.position_id

        idempotency_key = self.idempotency_key

        fraction = self.fraction

        agent_trace: dict[str, Any] | Unset = UNSET
        if not isinstance(self.agent_trace, Unset):
            agent_trace = self.agent_trace.to_dict()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "positionId": position_id,
            "idempotencyKey": idempotency_key,
        })
        if fraction is not UNSET:
            field_dict["fraction"] = fraction
        if agent_trace is not UNSET:
            field_dict["agentTrace"] = agent_trace

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_trace_metadata import AgentTraceMetadata
        d = dict(src_dict)
        position_id = d.pop("positionId")

        idempotency_key = d.pop("idempotencyKey")

        fraction = d.pop("fraction", UNSET)

        _agent_trace = d.pop("agentTrace", UNSET)
        agent_trace: AgentTraceMetadata | Unset
        if isinstance(_agent_trace,  Unset):
            agent_trace = UNSET
        else:
            agent_trace = AgentTraceMetadata.from_dict(_agent_trace)




        futures_close_request = cls(
            position_id=position_id,
            idempotency_key=idempotency_key,
            fraction=fraction,
            agent_trace=agent_trace,
        )


        futures_close_request.additional_properties = d
        return futures_close_request

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
