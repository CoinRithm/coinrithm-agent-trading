from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.decision_support import DecisionSupport





T = TypeVar("T", bound="GetMarketContextResponse200RelatedMarketsItem")



@_attrs_define
class GetMarketContextResponse200RelatedMarketsItem:
    """ 
        Attributes:
            source (str | Unset):
            title (str | Unset):
            outcome (None | str | Unset):
            probability (float | None | Unset): Leading-outcome probability as a 0..1 FRACTION —
                unlike the PM quote/discovery endpoints, which use
                0..100. Multiply by 100 before comparing.
            slug (str | Unset):
            volume24h (float | Unset):
            liquidity (float | Unset):
            decision_support (DecisionSupport | Unset): Pre-computed market-quality grade for a prediction market (the same
                builder the web event/hub cards use): a quality score + tiered
                liquidity/volume/spread + risk flags. Lets an agent gauge tradability
                without running its own analysis. Returned by get_market_context's
                relatedMarkets and by pm/quote.
     """

    source: str | Unset = UNSET
    title: str | Unset = UNSET
    outcome: None | str | Unset = UNSET
    probability: float | None | Unset = UNSET
    slug: str | Unset = UNSET
    volume24h: float | Unset = UNSET
    liquidity: float | Unset = UNSET
    decision_support: DecisionSupport | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.decision_support import DecisionSupport
        source = self.source

        title = self.title

        outcome: None | str | Unset
        if isinstance(self.outcome, Unset):
            outcome = UNSET
        else:
            outcome = self.outcome

        probability: float | None | Unset
        if isinstance(self.probability, Unset):
            probability = UNSET
        else:
            probability = self.probability

        slug = self.slug

        volume24h = self.volume24h

        liquidity = self.liquidity

        decision_support: dict[str, Any] | Unset = UNSET
        if not isinstance(self.decision_support, Unset):
            decision_support = self.decision_support.to_dict()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if source is not UNSET:
            field_dict["source"] = source
        if title is not UNSET:
            field_dict["title"] = title
        if outcome is not UNSET:
            field_dict["outcome"] = outcome
        if probability is not UNSET:
            field_dict["probability"] = probability
        if slug is not UNSET:
            field_dict["slug"] = slug
        if volume24h is not UNSET:
            field_dict["volume24h"] = volume24h
        if liquidity is not UNSET:
            field_dict["liquidity"] = liquidity
        if decision_support is not UNSET:
            field_dict["decisionSupport"] = decision_support

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.decision_support import DecisionSupport
        d = dict(src_dict)
        source = d.pop("source", UNSET)

        title = d.pop("title", UNSET)

        def _parse_outcome(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        outcome = _parse_outcome(d.pop("outcome", UNSET))


        def _parse_probability(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        probability = _parse_probability(d.pop("probability", UNSET))


        slug = d.pop("slug", UNSET)

        volume24h = d.pop("volume24h", UNSET)

        liquidity = d.pop("liquidity", UNSET)

        _decision_support = d.pop("decisionSupport", UNSET)
        decision_support: DecisionSupport | Unset
        if isinstance(_decision_support,  Unset):
            decision_support = UNSET
        else:
            decision_support = DecisionSupport.from_dict(_decision_support)




        get_market_context_response_200_related_markets_item = cls(
            source=source,
            title=title,
            outcome=outcome,
            probability=probability,
            slug=slug,
            volume24h=volume24h,
            liquidity=liquidity,
            decision_support=decision_support,
        )


        get_market_context_response_200_related_markets_item.additional_properties = d
        return get_market_context_response_200_related_markets_item

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
