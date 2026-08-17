from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_observation import AgentObservation
    from ..models.get_market_context_response_200_coin import GetMarketContextResponse200Coin
    from ..models.get_market_context_response_200_fear_greed_type_0 import GetMarketContextResponse200FearGreedType0
    from ..models.get_market_context_response_200_price_type_0 import GetMarketContextResponse200PriceType0
    from ..models.get_market_context_response_200_related_markets_item import (
        GetMarketContextResponse200RelatedMarketsItem,
    )
    from ..models.get_market_context_response_200_sentiment import GetMarketContextResponse200Sentiment
    from ..models.get_market_context_response_200_similar_coins_item import GetMarketContextResponse200SimilarCoinsItem


T = TypeVar("T", bound="GetMarketContextResponse200")


@_attrs_define
class GetMarketContextResponse200:
    """
    Attributes:
        coin (GetMarketContextResponse200Coin | Unset):
        price (GetMarketContextResponse200PriceType0 | None | Unset):
        sentiment (GetMarketContextResponse200Sentiment | Unset):
        fear_greed (GetMarketContextResponse200FearGreedType0 | None | Unset):
        related_markets (list[GetMarketContextResponse200RelatedMarketsItem] | Unset):
        similar_coins (list[GetMarketContextResponse200SimilarCoinsItem] | Unset): Peer coins by shared CoinGecko
            category (then market-cap
            neighbours), each with a live price. Call /api/agent/market
            on one to drill in.
        as_of (datetime.datetime | Unset):
        observation (AgentObservation | Unset): Compact provenance block for an agent-facing market observation. It is
            also stored in the private ledger responseSummary when the request uses
            agentTrace/run headers, giving run exports a verifiable snapshot of what
            the agent observed without creating a full market archive.
    """

    coin: GetMarketContextResponse200Coin | Unset = UNSET
    price: GetMarketContextResponse200PriceType0 | None | Unset = UNSET
    sentiment: GetMarketContextResponse200Sentiment | Unset = UNSET
    fear_greed: GetMarketContextResponse200FearGreedType0 | None | Unset = UNSET
    related_markets: list[GetMarketContextResponse200RelatedMarketsItem] | Unset = UNSET
    similar_coins: list[GetMarketContextResponse200SimilarCoinsItem] | Unset = UNSET
    as_of: datetime.datetime | Unset = UNSET
    observation: AgentObservation | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.get_market_context_response_200_fear_greed_type_0 import GetMarketContextResponse200FearGreedType0
        from ..models.get_market_context_response_200_price_type_0 import GetMarketContextResponse200PriceType0

        coin: dict[str, Any] | Unset = UNSET
        if not isinstance(self.coin, Unset):
            coin = self.coin.to_dict()

        price: dict[str, Any] | None | Unset
        if isinstance(self.price, Unset):
            price = UNSET
        elif isinstance(self.price, GetMarketContextResponse200PriceType0):
            price = self.price.to_dict()
        else:
            price = self.price

        sentiment: dict[str, Any] | Unset = UNSET
        if not isinstance(self.sentiment, Unset):
            sentiment = self.sentiment.to_dict()

        fear_greed: dict[str, Any] | None | Unset
        if isinstance(self.fear_greed, Unset):
            fear_greed = UNSET
        elif isinstance(self.fear_greed, GetMarketContextResponse200FearGreedType0):
            fear_greed = self.fear_greed.to_dict()
        else:
            fear_greed = self.fear_greed

        related_markets: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.related_markets, Unset):
            related_markets = []
            for related_markets_item_data in self.related_markets:
                related_markets_item = related_markets_item_data.to_dict()
                related_markets.append(related_markets_item)

        similar_coins: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.similar_coins, Unset):
            similar_coins = []
            for similar_coins_item_data in self.similar_coins:
                similar_coins_item = similar_coins_item_data.to_dict()
                similar_coins.append(similar_coins_item)

        as_of: str | Unset = UNSET
        if not isinstance(self.as_of, Unset):
            as_of = self.as_of.isoformat()

        observation: dict[str, Any] | Unset = UNSET
        if not isinstance(self.observation, Unset):
            observation = self.observation.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if coin is not UNSET:
            field_dict["coin"] = coin
        if price is not UNSET:
            field_dict["price"] = price
        if sentiment is not UNSET:
            field_dict["sentiment"] = sentiment
        if fear_greed is not UNSET:
            field_dict["fearGreed"] = fear_greed
        if related_markets is not UNSET:
            field_dict["relatedMarkets"] = related_markets
        if similar_coins is not UNSET:
            field_dict["similarCoins"] = similar_coins
        if as_of is not UNSET:
            field_dict["asOf"] = as_of
        if observation is not UNSET:
            field_dict["observation"] = observation

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_observation import AgentObservation
        from ..models.get_market_context_response_200_coin import GetMarketContextResponse200Coin
        from ..models.get_market_context_response_200_fear_greed_type_0 import GetMarketContextResponse200FearGreedType0
        from ..models.get_market_context_response_200_price_type_0 import GetMarketContextResponse200PriceType0
        from ..models.get_market_context_response_200_related_markets_item import (
            GetMarketContextResponse200RelatedMarketsItem,
        )
        from ..models.get_market_context_response_200_sentiment import GetMarketContextResponse200Sentiment
        from ..models.get_market_context_response_200_similar_coins_item import (
            GetMarketContextResponse200SimilarCoinsItem,
        )

        d = dict(src_dict)
        _coin = d.pop("coin", UNSET)
        coin: GetMarketContextResponse200Coin | Unset
        if isinstance(_coin, Unset):
            coin = UNSET
        else:
            coin = GetMarketContextResponse200Coin.from_dict(_coin)

        def _parse_price(data: object) -> GetMarketContextResponse200PriceType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                price_type_0 = GetMarketContextResponse200PriceType0.from_dict(data)

                return price_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(GetMarketContextResponse200PriceType0 | None | Unset, data)

        price = _parse_price(d.pop("price", UNSET))

        _sentiment = d.pop("sentiment", UNSET)
        sentiment: GetMarketContextResponse200Sentiment | Unset
        if isinstance(_sentiment, Unset):
            sentiment = UNSET
        else:
            sentiment = GetMarketContextResponse200Sentiment.from_dict(_sentiment)

        def _parse_fear_greed(data: object) -> GetMarketContextResponse200FearGreedType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                fear_greed_type_0 = GetMarketContextResponse200FearGreedType0.from_dict(data)

                return fear_greed_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(GetMarketContextResponse200FearGreedType0 | None | Unset, data)

        fear_greed = _parse_fear_greed(d.pop("fearGreed", UNSET))

        _related_markets = d.pop("relatedMarkets", UNSET)
        related_markets: list[GetMarketContextResponse200RelatedMarketsItem] | Unset = UNSET
        if _related_markets is not UNSET:
            related_markets = []
            for related_markets_item_data in _related_markets:
                related_markets_item = GetMarketContextResponse200RelatedMarketsItem.from_dict(
                    related_markets_item_data
                )

                related_markets.append(related_markets_item)

        _similar_coins = d.pop("similarCoins", UNSET)
        similar_coins: list[GetMarketContextResponse200SimilarCoinsItem] | Unset = UNSET
        if _similar_coins is not UNSET:
            similar_coins = []
            for similar_coins_item_data in _similar_coins:
                similar_coins_item = GetMarketContextResponse200SimilarCoinsItem.from_dict(similar_coins_item_data)

                similar_coins.append(similar_coins_item)

        _as_of = d.pop("asOf", UNSET)
        as_of: datetime.datetime | Unset
        if isinstance(_as_of, Unset):
            as_of = UNSET
        else:
            as_of = datetime.datetime.fromisoformat(_as_of)

        _observation = d.pop("observation", UNSET)
        observation: AgentObservation | Unset
        if isinstance(_observation, Unset):
            observation = UNSET
        else:
            observation = AgentObservation.from_dict(_observation)

        get_market_context_response_200 = cls(
            coin=coin,
            price=price,
            sentiment=sentiment,
            fear_greed=fear_greed,
            related_markets=related_markets,
            similar_coins=similar_coins,
            as_of=as_of,
            observation=observation,
        )

        get_market_context_response_200.additional_properties = d
        return get_market_context_response_200

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
