from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_observation import AgentObservation
    from ..models.freshness import Freshness
    from ..models.futures_quote_response_coin import FuturesQuoteResponseCoin


T = TypeVar("T", bound="FuturesQuoteResponse")


@_attrs_define
class FuturesQuoteResponse:
    """
    Attributes:
        eligible (bool | Unset):
        block_reasons (list[str] | Unset):
        coin (FuturesQuoteResponseCoin | Unset):
        side (None | str | Unset):
        leverage (float | None | Unset):
        margin_musd (float | None | Unset):
        min_margin (float | Unset):
        max_leverage (float | Unset):
        entry_price (float | None | Unset):
        notional_musd (float | None | Unset):
        size_coin (float | None | Unset):
        liquidation_price (float | None | Unset):
        maintenance_margin_rate (float | None | Unset):
        freshness (Freshness | Unset): Data-freshness descriptor. Futures + spot use ageSeconds; PM uses
            ageMinutes. `status` is a freshness label; `basis` (PM only) names which
            timestamp the age was measured against.
        observation (AgentObservation | Unset): Compact provenance block for an agent-facing market observation. It is
            also stored in the private ledger responseSummary when the request uses
            agentTrace/run headers, giving run exports a verifiable snapshot of what
            the agent observed without creating a full market archive.
    """

    eligible: bool | Unset = UNSET
    block_reasons: list[str] | Unset = UNSET
    coin: FuturesQuoteResponseCoin | Unset = UNSET
    side: None | str | Unset = UNSET
    leverage: float | None | Unset = UNSET
    margin_musd: float | None | Unset = UNSET
    min_margin: float | Unset = UNSET
    max_leverage: float | Unset = UNSET
    entry_price: float | None | Unset = UNSET
    notional_musd: float | None | Unset = UNSET
    size_coin: float | None | Unset = UNSET
    liquidation_price: float | None | Unset = UNSET
    maintenance_margin_rate: float | None | Unset = UNSET
    freshness: Freshness | Unset = UNSET
    observation: AgentObservation | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        eligible = self.eligible

        block_reasons: list[str] | Unset = UNSET
        if not isinstance(self.block_reasons, Unset):
            block_reasons = self.block_reasons

        coin: dict[str, Any] | Unset = UNSET
        if not isinstance(self.coin, Unset):
            coin = self.coin.to_dict()

        side: None | str | Unset
        if isinstance(self.side, Unset):
            side = UNSET
        else:
            side = self.side

        leverage: float | None | Unset
        if isinstance(self.leverage, Unset):
            leverage = UNSET
        else:
            leverage = self.leverage

        margin_musd: float | None | Unset
        if isinstance(self.margin_musd, Unset):
            margin_musd = UNSET
        else:
            margin_musd = self.margin_musd

        min_margin = self.min_margin

        max_leverage = self.max_leverage

        entry_price: float | None | Unset
        if isinstance(self.entry_price, Unset):
            entry_price = UNSET
        else:
            entry_price = self.entry_price

        notional_musd: float | None | Unset
        if isinstance(self.notional_musd, Unset):
            notional_musd = UNSET
        else:
            notional_musd = self.notional_musd

        size_coin: float | None | Unset
        if isinstance(self.size_coin, Unset):
            size_coin = UNSET
        else:
            size_coin = self.size_coin

        liquidation_price: float | None | Unset
        if isinstance(self.liquidation_price, Unset):
            liquidation_price = UNSET
        else:
            liquidation_price = self.liquidation_price

        maintenance_margin_rate: float | None | Unset
        if isinstance(self.maintenance_margin_rate, Unset):
            maintenance_margin_rate = UNSET
        else:
            maintenance_margin_rate = self.maintenance_margin_rate

        freshness: dict[str, Any] | Unset = UNSET
        if not isinstance(self.freshness, Unset):
            freshness = self.freshness.to_dict()

        observation: dict[str, Any] | Unset = UNSET
        if not isinstance(self.observation, Unset):
            observation = self.observation.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if eligible is not UNSET:
            field_dict["eligible"] = eligible
        if block_reasons is not UNSET:
            field_dict["blockReasons"] = block_reasons
        if coin is not UNSET:
            field_dict["coin"] = coin
        if side is not UNSET:
            field_dict["side"] = side
        if leverage is not UNSET:
            field_dict["leverage"] = leverage
        if margin_musd is not UNSET:
            field_dict["marginMusd"] = margin_musd
        if min_margin is not UNSET:
            field_dict["minMargin"] = min_margin
        if max_leverage is not UNSET:
            field_dict["maxLeverage"] = max_leverage
        if entry_price is not UNSET:
            field_dict["entryPrice"] = entry_price
        if notional_musd is not UNSET:
            field_dict["notionalMusd"] = notional_musd
        if size_coin is not UNSET:
            field_dict["sizeCoin"] = size_coin
        if liquidation_price is not UNSET:
            field_dict["liquidationPrice"] = liquidation_price
        if maintenance_margin_rate is not UNSET:
            field_dict["maintenanceMarginRate"] = maintenance_margin_rate
        if freshness is not UNSET:
            field_dict["freshness"] = freshness
        if observation is not UNSET:
            field_dict["observation"] = observation

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_observation import AgentObservation
        from ..models.freshness import Freshness
        from ..models.futures_quote_response_coin import FuturesQuoteResponseCoin

        d = dict(src_dict)
        eligible = d.pop("eligible", UNSET)

        block_reasons = cast(list[str], d.pop("blockReasons", UNSET))

        _coin = d.pop("coin", UNSET)
        coin: FuturesQuoteResponseCoin | Unset
        if isinstance(_coin, Unset):
            coin = UNSET
        else:
            coin = FuturesQuoteResponseCoin.from_dict(_coin)

        def _parse_side(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        side = _parse_side(d.pop("side", UNSET))

        def _parse_leverage(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        leverage = _parse_leverage(d.pop("leverage", UNSET))

        def _parse_margin_musd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        margin_musd = _parse_margin_musd(d.pop("marginMusd", UNSET))

        min_margin = d.pop("minMargin", UNSET)

        max_leverage = d.pop("maxLeverage", UNSET)

        def _parse_entry_price(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        entry_price = _parse_entry_price(d.pop("entryPrice", UNSET))

        def _parse_notional_musd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        notional_musd = _parse_notional_musd(d.pop("notionalMusd", UNSET))

        def _parse_size_coin(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        size_coin = _parse_size_coin(d.pop("sizeCoin", UNSET))

        def _parse_liquidation_price(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        liquidation_price = _parse_liquidation_price(d.pop("liquidationPrice", UNSET))

        def _parse_maintenance_margin_rate(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        maintenance_margin_rate = _parse_maintenance_margin_rate(d.pop("maintenanceMarginRate", UNSET))

        _freshness = d.pop("freshness", UNSET)
        freshness: Freshness | Unset
        if isinstance(_freshness, Unset):
            freshness = UNSET
        else:
            freshness = Freshness.from_dict(_freshness)

        _observation = d.pop("observation", UNSET)
        observation: AgentObservation | Unset
        if isinstance(_observation, Unset):
            observation = UNSET
        else:
            observation = AgentObservation.from_dict(_observation)

        futures_quote_response = cls(
            eligible=eligible,
            block_reasons=block_reasons,
            coin=coin,
            side=side,
            leverage=leverage,
            margin_musd=margin_musd,
            min_margin=min_margin,
            max_leverage=max_leverage,
            entry_price=entry_price,
            notional_musd=notional_musd,
            size_coin=size_coin,
            liquidation_price=liquidation_price,
            maintenance_margin_rate=maintenance_margin_rate,
            freshness=freshness,
            observation=observation,
        )

        futures_quote_response.additional_properties = d
        return futures_quote_response

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
