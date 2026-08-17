from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.get_candles_response_200_range import GetCandlesResponse200Range
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_observation import AgentObservation
    from ..models.get_candles_response_200_candles_item import GetCandlesResponse200CandlesItem
    from ..models.get_candles_response_200_coin import GetCandlesResponse200Coin


T = TypeVar("T", bound="GetCandlesResponse200")


@_attrs_define
class GetCandlesResponse200:
    """
    Attributes:
        coin (GetCandlesResponse200Coin | Unset):
        range_ (GetCandlesResponse200Range | Unset):
        fiat (str | Unset):
        rate_to_usd (float | Unset): Latest fiat-per-USD rate applied (1 for USD).
        candles (list[GetCandlesResponse200CandlesItem] | Unset): Oldest → newest.
        observation (AgentObservation | Unset): Compact provenance block for an agent-facing market observation. It is
            also stored in the private ledger responseSummary when the request uses
            agentTrace/run headers, giving run exports a verifiable snapshot of what
            the agent observed without creating a full market archive.
    """

    coin: GetCandlesResponse200Coin | Unset = UNSET
    range_: GetCandlesResponse200Range | Unset = UNSET
    fiat: str | Unset = UNSET
    rate_to_usd: float | Unset = UNSET
    candles: list[GetCandlesResponse200CandlesItem] | Unset = UNSET
    observation: AgentObservation | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        coin: dict[str, Any] | Unset = UNSET
        if not isinstance(self.coin, Unset):
            coin = self.coin.to_dict()

        range_: str | Unset = UNSET
        if not isinstance(self.range_, Unset):
            range_ = self.range_.value

        fiat = self.fiat

        rate_to_usd = self.rate_to_usd

        candles: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.candles, Unset):
            candles = []
            for candles_item_data in self.candles:
                candles_item = candles_item_data.to_dict()
                candles.append(candles_item)

        observation: dict[str, Any] | Unset = UNSET
        if not isinstance(self.observation, Unset):
            observation = self.observation.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if coin is not UNSET:
            field_dict["coin"] = coin
        if range_ is not UNSET:
            field_dict["range"] = range_
        if fiat is not UNSET:
            field_dict["fiat"] = fiat
        if rate_to_usd is not UNSET:
            field_dict["rateToUsd"] = rate_to_usd
        if candles is not UNSET:
            field_dict["candles"] = candles
        if observation is not UNSET:
            field_dict["observation"] = observation

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_observation import AgentObservation
        from ..models.get_candles_response_200_candles_item import GetCandlesResponse200CandlesItem
        from ..models.get_candles_response_200_coin import GetCandlesResponse200Coin

        d = dict(src_dict)
        _coin = d.pop("coin", UNSET)
        coin: GetCandlesResponse200Coin | Unset
        if isinstance(_coin, Unset):
            coin = UNSET
        else:
            coin = GetCandlesResponse200Coin.from_dict(_coin)

        _range_ = d.pop("range", UNSET)
        range_: GetCandlesResponse200Range | Unset
        if isinstance(_range_, Unset):
            range_ = UNSET
        else:
            range_ = GetCandlesResponse200Range(_range_)

        fiat = d.pop("fiat", UNSET)

        rate_to_usd = d.pop("rateToUsd", UNSET)

        _candles = d.pop("candles", UNSET)
        candles: list[GetCandlesResponse200CandlesItem] | Unset = UNSET
        if _candles is not UNSET:
            candles = []
            for candles_item_data in _candles:
                candles_item = GetCandlesResponse200CandlesItem.from_dict(candles_item_data)

                candles.append(candles_item)

        _observation = d.pop("observation", UNSET)
        observation: AgentObservation | Unset
        if isinstance(_observation, Unset):
            observation = UNSET
        else:
            observation = AgentObservation.from_dict(_observation)

        get_candles_response_200 = cls(
            coin=coin,
            range_=range_,
            fiat=fiat,
            rate_to_usd=rate_to_usd,
            candles=candles,
            observation=observation,
        )

        get_candles_response_200.additional_properties = d
        return get_candles_response_200

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
