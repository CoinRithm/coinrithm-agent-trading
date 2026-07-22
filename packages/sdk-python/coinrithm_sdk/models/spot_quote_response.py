from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.spot_quote_response_side import SpotQuoteResponseSide
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
from typing import Literal, cast
import datetime

if TYPE_CHECKING:
  from ..models.agent_observation import AgentObservation
  from ..models.execution_model import ExecutionModel
  from ..models.freshness import Freshness
  from ..models.spot_quote_response_available import SpotQuoteResponseAvailable
  from ..models.spot_quote_response_coin import SpotQuoteResponseCoin





T = TypeVar("T", bound="SpotQuoteResponse")



@_attrs_define
class SpotQuoteResponse:
    """ 
        Attributes:
            eligible (bool | Unset):
            block_reasons (list[str] | Unset): e.g. price_unavailable, insufficient_usdt_balance,
                insufficient_coin_balance, wallet_not_found.
            coin (SpotQuoteResponseCoin | Unset):
            side (SpotQuoteResponseSide | Unset):
            quantity (float | Unset):
            order_type (Literal['market'] | Unset):
            execution_price (float | None | Unset): Estimated fill price — live mid adjusted for spread+slippage; null when
                unavailable.
            estimated_cost_musd (float | None | Unset): Gross notional (price × quantity). BUY = cash debited; SELL =
                proceeds.
            estimated_fee_musd (float | None | Unset): Estimated taker fee for this trade (mUSD), included in the
                affordability check.
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
            available (SpotQuoteResponseAvailable | Unset):
            freshness (Freshness | Unset): Data-freshness descriptor. Futures + spot use ageSeconds; PM uses
                ageMinutes. `status` is a freshness label; `basis` (PM only) names which
                timestamp the age was measured against.
            as_of (datetime.datetime | Unset):
            observation (AgentObservation | Unset): Compact provenance block for an agent-facing market observation. It is
                also stored in the private ledger responseSummary when the request uses
                agentTrace/run headers, giving run exports a verifiable snapshot of what
                the agent observed without creating a full market archive.
     """

    eligible: bool | Unset = UNSET
    block_reasons: list[str] | Unset = UNSET
    coin: SpotQuoteResponseCoin | Unset = UNSET
    side: SpotQuoteResponseSide | Unset = UNSET
    quantity: float | Unset = UNSET
    order_type: Literal['market'] | Unset = UNSET
    execution_price: float | None | Unset = UNSET
    estimated_cost_musd: float | None | Unset = UNSET
    estimated_fee_musd: float | None | Unset = UNSET
    execution_model: ExecutionModel | Unset = UNSET
    available: SpotQuoteResponseAvailable | Unset = UNSET
    freshness: Freshness | Unset = UNSET
    as_of: datetime.datetime | Unset = UNSET
    observation: AgentObservation | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.agent_observation import AgentObservation
        from ..models.execution_model import ExecutionModel
        from ..models.freshness import Freshness
        from ..models.spot_quote_response_available import SpotQuoteResponseAvailable
        from ..models.spot_quote_response_coin import SpotQuoteResponseCoin
        eligible = self.eligible

        block_reasons: list[str] | Unset = UNSET
        if not isinstance(self.block_reasons, Unset):
            block_reasons = self.block_reasons



        coin: dict[str, Any] | Unset = UNSET
        if not isinstance(self.coin, Unset):
            coin = self.coin.to_dict()

        side: str | Unset = UNSET
        if not isinstance(self.side, Unset):
            side = self.side.value


        quantity = self.quantity

        order_type = self.order_type

        execution_price: float | None | Unset
        if isinstance(self.execution_price, Unset):
            execution_price = UNSET
        else:
            execution_price = self.execution_price

        estimated_cost_musd: float | None | Unset
        if isinstance(self.estimated_cost_musd, Unset):
            estimated_cost_musd = UNSET
        else:
            estimated_cost_musd = self.estimated_cost_musd

        estimated_fee_musd: float | None | Unset
        if isinstance(self.estimated_fee_musd, Unset):
            estimated_fee_musd = UNSET
        else:
            estimated_fee_musd = self.estimated_fee_musd

        execution_model: dict[str, Any] | Unset = UNSET
        if not isinstance(self.execution_model, Unset):
            execution_model = self.execution_model.to_dict()

        available: dict[str, Any] | Unset = UNSET
        if not isinstance(self.available, Unset):
            available = self.available.to_dict()

        freshness: dict[str, Any] | Unset = UNSET
        if not isinstance(self.freshness, Unset):
            freshness = self.freshness.to_dict()

        as_of: str | Unset = UNSET
        if not isinstance(self.as_of, Unset):
            as_of = self.as_of.isoformat()

        observation: dict[str, Any] | Unset = UNSET
        if not isinstance(self.observation, Unset):
            observation = self.observation.to_dict()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if eligible is not UNSET:
            field_dict["eligible"] = eligible
        if block_reasons is not UNSET:
            field_dict["blockReasons"] = block_reasons
        if coin is not UNSET:
            field_dict["coin"] = coin
        if side is not UNSET:
            field_dict["side"] = side
        if quantity is not UNSET:
            field_dict["quantity"] = quantity
        if order_type is not UNSET:
            field_dict["orderType"] = order_type
        if execution_price is not UNSET:
            field_dict["executionPrice"] = execution_price
        if estimated_cost_musd is not UNSET:
            field_dict["estimatedCostMusd"] = estimated_cost_musd
        if estimated_fee_musd is not UNSET:
            field_dict["estimatedFeeMusd"] = estimated_fee_musd
        if execution_model is not UNSET:
            field_dict["executionModel"] = execution_model
        if available is not UNSET:
            field_dict["available"] = available
        if freshness is not UNSET:
            field_dict["freshness"] = freshness
        if as_of is not UNSET:
            field_dict["asOf"] = as_of
        if observation is not UNSET:
            field_dict["observation"] = observation

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_observation import AgentObservation
        from ..models.execution_model import ExecutionModel
        from ..models.freshness import Freshness
        from ..models.spot_quote_response_available import SpotQuoteResponseAvailable
        from ..models.spot_quote_response_coin import SpotQuoteResponseCoin
        d = dict(src_dict)
        eligible = d.pop("eligible", UNSET)

        block_reasons = cast(list[str], d.pop("blockReasons", UNSET))


        _coin = d.pop("coin", UNSET)
        coin: SpotQuoteResponseCoin | Unset
        if isinstance(_coin,  Unset):
            coin = UNSET
        else:
            coin = SpotQuoteResponseCoin.from_dict(_coin)




        _side = d.pop("side", UNSET)
        side: SpotQuoteResponseSide | Unset
        if isinstance(_side,  Unset):
            side = UNSET
        else:
            side = SpotQuoteResponseSide(_side)




        quantity = d.pop("quantity", UNSET)

        order_type = cast(Literal['market'] | Unset , d.pop("orderType", UNSET))
        if order_type != 'market'and not isinstance(order_type, Unset):
            raise ValueError(f"orderType must match const 'market', got '{order_type}'")

        def _parse_execution_price(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        execution_price = _parse_execution_price(d.pop("executionPrice", UNSET))


        def _parse_estimated_cost_musd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        estimated_cost_musd = _parse_estimated_cost_musd(d.pop("estimatedCostMusd", UNSET))


        def _parse_estimated_fee_musd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        estimated_fee_musd = _parse_estimated_fee_musd(d.pop("estimatedFeeMusd", UNSET))


        _execution_model = d.pop("executionModel", UNSET)
        execution_model: ExecutionModel | Unset
        if isinstance(_execution_model,  Unset):
            execution_model = UNSET
        else:
            execution_model = ExecutionModel.from_dict(_execution_model)




        _available = d.pop("available", UNSET)
        available: SpotQuoteResponseAvailable | Unset
        if isinstance(_available,  Unset):
            available = UNSET
        else:
            available = SpotQuoteResponseAvailable.from_dict(_available)




        _freshness = d.pop("freshness", UNSET)
        freshness: Freshness | Unset
        if isinstance(_freshness,  Unset):
            freshness = UNSET
        else:
            freshness = Freshness.from_dict(_freshness)




        _as_of = d.pop("asOf", UNSET)
        as_of: datetime.datetime | Unset
        if isinstance(_as_of,  Unset):
            as_of = UNSET
        else:
            as_of = isoparse(_as_of)




        _observation = d.pop("observation", UNSET)
        observation: AgentObservation | Unset
        if isinstance(_observation,  Unset):
            observation = UNSET
        else:
            observation = AgentObservation.from_dict(_observation)




        spot_quote_response = cls(
            eligible=eligible,
            block_reasons=block_reasons,
            coin=coin,
            side=side,
            quantity=quantity,
            order_type=order_type,
            execution_price=execution_price,
            estimated_cost_musd=estimated_cost_musd,
            estimated_fee_musd=estimated_fee_musd,
            execution_model=execution_model,
            available=available,
            freshness=freshness,
            as_of=as_of,
            observation=observation,
        )


        spot_quote_response.additional_properties = d
        return spot_quote_response

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
