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
    from ..models.get_market_context_response_200_futures_entry_eligibility import (
        GetMarketContextResponse200FuturesEntryEligibility,
    )
    from ..models.get_market_context_response_200_price_type_0 import GetMarketContextResponse200PriceType0
    from ..models.get_market_context_response_200_related_markets_item import (
        GetMarketContextResponse200RelatedMarketsItem,
    )
    from ..models.get_market_context_response_200_sentiment import GetMarketContextResponse200Sentiment
    from ..models.get_market_context_response_200_similar_coins_item import GetMarketContextResponse200SimilarCoinsItem
    from ..models.market_defi_context import MarketDefiContext
    from ..models.market_derivatives_context import MarketDerivativesContext
    from ..models.market_funding_context import MarketFundingContext
    from ..models.market_macro_context import MarketMacroContext
    from ..models.spot_price_timing import SpotPriceTiming


T = TypeVar("T", bound="GetMarketContextResponse200")


@_attrs_define
class GetMarketContextResponse200:
    """
    Attributes:
        coin (GetMarketContextResponse200Coin | Unset):
        price (GetMarketContextResponse200PriceType0 | None | Unset):
        price_timing (SpotPriceTiming | Unset): Source-vs-row timing of the spot price (optional: absent on older API
            versions). Informational only: `freshness`, `eligible` and the write
            path's mark guard still measure the row WRITE time and are unchanged.
            `sourceObservedAt` is a venue snapshot/ticker time, NOT a last-trade
            time and NOT a per-fill receipt.
        funding (MarketFundingContext | None | Unset):
        derivatives (MarketDerivativesContext | Unset): Optional on older APIs. Members are additive and may be absent
            on older APIs; each can independently be null when unavailable or unusable.
        macro (MarketMacroContext | None | Unset):
        defi (MarketDefiContext | None | Unset):
        sentiment (GetMarketContextResponse200Sentiment | Unset):
        fear_greed (GetMarketContextResponse200FearGreedType0 | None | Unset):
        futures_entry_eligibility (GetMarketContextResponse200FuturesEntryEligibility | Unset): What the server entry
            gate's perpetual-reference rule says
            about a NEW futures open on this coin right now (backend-v2
            #106). Informational: quote/open re-check at execution,
            and eligibility can change in between. Adds to and closes
            of an existing position are never refused for it.
            `reference_unavailable` states that CoinRithm holds no
            supported perpetual reference for the coin, not that no
            perpetual exists anywhere. Absent on older API versions.
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
    price_timing: SpotPriceTiming | Unset = UNSET
    funding: MarketFundingContext | None | Unset = UNSET
    derivatives: MarketDerivativesContext | Unset = UNSET
    macro: MarketMacroContext | None | Unset = UNSET
    defi: MarketDefiContext | None | Unset = UNSET
    sentiment: GetMarketContextResponse200Sentiment | Unset = UNSET
    fear_greed: GetMarketContextResponse200FearGreedType0 | None | Unset = UNSET
    futures_entry_eligibility: GetMarketContextResponse200FuturesEntryEligibility | Unset = UNSET
    related_markets: list[GetMarketContextResponse200RelatedMarketsItem] | Unset = UNSET
    similar_coins: list[GetMarketContextResponse200SimilarCoinsItem] | Unset = UNSET
    as_of: datetime.datetime | Unset = UNSET
    observation: AgentObservation | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.get_market_context_response_200_fear_greed_type_0 import GetMarketContextResponse200FearGreedType0
        from ..models.get_market_context_response_200_price_type_0 import GetMarketContextResponse200PriceType0
        from ..models.market_defi_context import MarketDefiContext
        from ..models.market_funding_context import MarketFundingContext
        from ..models.market_macro_context import MarketMacroContext

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

        price_timing: dict[str, Any] | Unset = UNSET
        if not isinstance(self.price_timing, Unset):
            price_timing = self.price_timing.to_dict()

        funding: dict[str, Any] | None | Unset
        if isinstance(self.funding, Unset):
            funding = UNSET
        elif isinstance(self.funding, MarketFundingContext):
            funding = self.funding.to_dict()
        else:
            funding = self.funding

        derivatives: dict[str, Any] | Unset = UNSET
        if not isinstance(self.derivatives, Unset):
            derivatives = self.derivatives.to_dict()

        macro: dict[str, Any] | None | Unset
        if isinstance(self.macro, Unset):
            macro = UNSET
        elif isinstance(self.macro, MarketMacroContext):
            macro = self.macro.to_dict()
        else:
            macro = self.macro

        defi: dict[str, Any] | None | Unset
        if isinstance(self.defi, Unset):
            defi = UNSET
        elif isinstance(self.defi, MarketDefiContext):
            defi = self.defi.to_dict()
        else:
            defi = self.defi

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

        futures_entry_eligibility: dict[str, Any] | Unset = UNSET
        if not isinstance(self.futures_entry_eligibility, Unset):
            futures_entry_eligibility = self.futures_entry_eligibility.to_dict()

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
        if price_timing is not UNSET:
            field_dict["priceTiming"] = price_timing
        if funding is not UNSET:
            field_dict["funding"] = funding
        if derivatives is not UNSET:
            field_dict["derivatives"] = derivatives
        if macro is not UNSET:
            field_dict["macro"] = macro
        if defi is not UNSET:
            field_dict["defi"] = defi
        if sentiment is not UNSET:
            field_dict["sentiment"] = sentiment
        if fear_greed is not UNSET:
            field_dict["fearGreed"] = fear_greed
        if futures_entry_eligibility is not UNSET:
            field_dict["futuresEntryEligibility"] = futures_entry_eligibility
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
        from ..models.get_market_context_response_200_futures_entry_eligibility import (
            GetMarketContextResponse200FuturesEntryEligibility,
        )
        from ..models.get_market_context_response_200_price_type_0 import GetMarketContextResponse200PriceType0
        from ..models.get_market_context_response_200_related_markets_item import (
            GetMarketContextResponse200RelatedMarketsItem,
        )
        from ..models.get_market_context_response_200_sentiment import GetMarketContextResponse200Sentiment
        from ..models.get_market_context_response_200_similar_coins_item import (
            GetMarketContextResponse200SimilarCoinsItem,
        )
        from ..models.market_defi_context import MarketDefiContext
        from ..models.market_derivatives_context import MarketDerivativesContext
        from ..models.market_funding_context import MarketFundingContext
        from ..models.market_macro_context import MarketMacroContext
        from ..models.spot_price_timing import SpotPriceTiming

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

        _price_timing = d.pop("priceTiming", UNSET)
        price_timing: SpotPriceTiming | Unset
        if isinstance(_price_timing, Unset):
            price_timing = UNSET
        else:
            price_timing = SpotPriceTiming.from_dict(_price_timing)

        def _parse_funding(data: object) -> MarketFundingContext | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                funding_type_0 = MarketFundingContext.from_dict(data)

                return funding_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(MarketFundingContext | None | Unset, data)

        funding = _parse_funding(d.pop("funding", UNSET))

        _derivatives = d.pop("derivatives", UNSET)
        derivatives: MarketDerivativesContext | Unset
        if isinstance(_derivatives, Unset):
            derivatives = UNSET
        else:
            derivatives = MarketDerivativesContext.from_dict(_derivatives)

        def _parse_macro(data: object) -> MarketMacroContext | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                macro_type_0 = MarketMacroContext.from_dict(data)

                return macro_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(MarketMacroContext | None | Unset, data)

        macro = _parse_macro(d.pop("macro", UNSET))

        def _parse_defi(data: object) -> MarketDefiContext | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                defi_type_0 = MarketDefiContext.from_dict(data)

                return defi_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(MarketDefiContext | None | Unset, data)

        defi = _parse_defi(d.pop("defi", UNSET))

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

        _futures_entry_eligibility = d.pop("futuresEntryEligibility", UNSET)
        futures_entry_eligibility: GetMarketContextResponse200FuturesEntryEligibility | Unset
        if isinstance(_futures_entry_eligibility, Unset):
            futures_entry_eligibility = UNSET
        else:
            futures_entry_eligibility = GetMarketContextResponse200FuturesEntryEligibility.from_dict(
                _futures_entry_eligibility
            )

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
            as_of = datetime.datetime.fromisoformat(_as_of.replace("Z", "+00:00"))

        _observation = d.pop("observation", UNSET)
        observation: AgentObservation | Unset
        if isinstance(_observation, Unset):
            observation = UNSET
        else:
            observation = AgentObservation.from_dict(_observation)

        get_market_context_response_200 = cls(
            coin=coin,
            price=price,
            price_timing=price_timing,
            funding=funding,
            derivatives=derivatives,
            macro=macro,
            defi=defi,
            sentiment=sentiment,
            fear_greed=fear_greed,
            futures_entry_eligibility=futures_entry_eligibility,
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
