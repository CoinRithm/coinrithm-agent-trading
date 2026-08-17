from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.futures_open_request_side import FuturesOpenRequestSide
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_trace_metadata import AgentTraceMetadata


T = TypeVar("T", bound="FuturesOpenRequest")


@_attrs_define
class FuturesOpenRequest:
    """
    Attributes:
        coin_id (str):
        side (FuturesOpenRequestSide):
        leverage (float):
        margin_musd (float):
        idempotency_key (str): Unique per intent. Reusing it replays the original result.
        stop_loss_price (float | None | Unset): Optional open-time resting stop-loss. Side-aware: long requires
            liq < SL < entry mark; short requires entry mark < SL < liq
            (rejected as a dead trigger otherwise). Fired by the per-minute
            worker; the FULL position settles at mark with
            exitReason=stop_loss. Not accepted on an ADD — use /futures/sl-tp.
        take_profit_price (float | None | Unset): Optional open-time resting take-profit (long: above mark; short:
            below). Same worker semantics, exitReason=take_profit.
        agent_trace (AgentTraceMetadata | Unset): Optional private trace metadata supplied by a user-run agent.
            CoinRithm
            stores only this structured summary; do not send chain-of-thought,
            secrets, emails, or private account identity.
    """

    coin_id: str
    side: FuturesOpenRequestSide
    leverage: float
    margin_musd: float
    idempotency_key: str
    stop_loss_price: float | None | Unset = UNSET
    take_profit_price: float | None | Unset = UNSET
    agent_trace: AgentTraceMetadata | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        coin_id = self.coin_id

        side = self.side.value

        leverage = self.leverage

        margin_musd = self.margin_musd

        idempotency_key = self.idempotency_key

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
                "coinId": coin_id,
                "side": side,
                "leverage": leverage,
                "marginMusd": margin_musd,
                "idempotencyKey": idempotency_key,
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
        coin_id = d.pop("coinId")

        side = FuturesOpenRequestSide(d.pop("side"))

        leverage = d.pop("leverage")

        margin_musd = d.pop("marginMusd")

        idempotency_key = d.pop("idempotencyKey")

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

        futures_open_request = cls(
            coin_id=coin_id,
            side=side,
            leverage=leverage,
            margin_musd=margin_musd,
            idempotency_key=idempotency_key,
            stop_loss_price=stop_loss_price,
            take_profit_price=take_profit_price,
            agent_trace=agent_trace,
        )

        futures_open_request.additional_properties = d
        return futures_open_request

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
