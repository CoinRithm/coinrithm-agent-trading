from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.pm_quote_request_side import PmQuoteRequestSide
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.agent_trace_metadata import AgentTraceMetadata





T = TypeVar("T", bound="PmQuoteRequest")



@_attrs_define
class PmQuoteRequest:
    """ 
        Attributes:
            source (str): Source slug, e.g. kalshi / polymarket (lowercased)
            slug (str): Event slug (lowercased)
            outcome_external_market_id (str): Case-sensitive outcome/market id
            stake_musd (float): mUSD to stake (> 0; min to open is 10)
            side (PmQuoteRequestSide | Unset): Which side of the binary outcome to back. "yes" (default) pays out
                if the outcome resolves true; "no" pays out if it resolves false
                (a NO entry fills at 100 minus the outcome probability).
                 Default: PmQuoteRequestSide.YES.
            agent_trace (AgentTraceMetadata | Unset): Optional private trace metadata supplied by a user-run agent.
                CoinRithm
                stores only this structured summary; do not send chain-of-thought,
                secrets, emails, or private account identity.
     """

    source: str
    slug: str
    outcome_external_market_id: str
    stake_musd: float
    side: PmQuoteRequestSide | Unset = PmQuoteRequestSide.YES
    agent_trace: AgentTraceMetadata | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.agent_trace_metadata import AgentTraceMetadata
        source = self.source

        slug = self.slug

        outcome_external_market_id = self.outcome_external_market_id

        stake_musd = self.stake_musd

        side: str | Unset = UNSET
        if not isinstance(self.side, Unset):
            side = self.side.value


        agent_trace: dict[str, Any] | Unset = UNSET
        if not isinstance(self.agent_trace, Unset):
            agent_trace = self.agent_trace.to_dict()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "source": source,
            "slug": slug,
            "outcomeExternalMarketId": outcome_external_market_id,
            "stakeMusd": stake_musd,
        })
        if side is not UNSET:
            field_dict["side"] = side
        if agent_trace is not UNSET:
            field_dict["agentTrace"] = agent_trace

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_trace_metadata import AgentTraceMetadata
        d = dict(src_dict)
        source = d.pop("source")

        slug = d.pop("slug")

        outcome_external_market_id = d.pop("outcomeExternalMarketId")

        stake_musd = d.pop("stakeMusd")

        _side = d.pop("side", UNSET)
        side: PmQuoteRequestSide | Unset
        if isinstance(_side,  Unset):
            side = UNSET
        else:
            side = PmQuoteRequestSide(_side)




        _agent_trace = d.pop("agentTrace", UNSET)
        agent_trace: AgentTraceMetadata | Unset
        if isinstance(_agent_trace,  Unset):
            agent_trace = UNSET
        else:
            agent_trace = AgentTraceMetadata.from_dict(_agent_trace)




        pm_quote_request = cls(
            source=source,
            slug=slug,
            outcome_external_market_id=outcome_external_market_id,
            stake_musd=stake_musd,
            side=side,
            agent_trace=agent_trace,
        )


        pm_quote_request.additional_properties = d
        return pm_quote_request

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
