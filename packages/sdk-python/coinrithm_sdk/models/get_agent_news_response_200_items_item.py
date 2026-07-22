from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime






T = TypeVar("T", bound="GetAgentNewsResponse200ItemsItem")



@_attrs_define
class GetAgentNewsResponse200ItemsItem:
    """ 
        Attributes:
            title (str | Unset):
            source (str | Unset):
            url (str | Unset):
            published_at (datetime.datetime | Unset):
            age_minutes (int | Unset):
            category (None | str | Unset):
            sentiment (None | str | Unset): bullish | bearish | neutral
            sentiment_confidence (float | None | Unset):
            importance (int | None | Unset): 0–10; 8+ = genuinely market-moving.
            coins (list[str] | Unset): Which of the requested coins this story concerns.
     """

    title: str | Unset = UNSET
    source: str | Unset = UNSET
    url: str | Unset = UNSET
    published_at: datetime.datetime | Unset = UNSET
    age_minutes: int | Unset = UNSET
    category: None | str | Unset = UNSET
    sentiment: None | str | Unset = UNSET
    sentiment_confidence: float | None | Unset = UNSET
    importance: int | None | Unset = UNSET
    coins: list[str] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        title = self.title

        source = self.source

        url = self.url

        published_at: str | Unset = UNSET
        if not isinstance(self.published_at, Unset):
            published_at = self.published_at.isoformat()

        age_minutes = self.age_minutes

        category: None | str | Unset
        if isinstance(self.category, Unset):
            category = UNSET
        else:
            category = self.category

        sentiment: None | str | Unset
        if isinstance(self.sentiment, Unset):
            sentiment = UNSET
        else:
            sentiment = self.sentiment

        sentiment_confidence: float | None | Unset
        if isinstance(self.sentiment_confidence, Unset):
            sentiment_confidence = UNSET
        else:
            sentiment_confidence = self.sentiment_confidence

        importance: int | None | Unset
        if isinstance(self.importance, Unset):
            importance = UNSET
        else:
            importance = self.importance

        coins: list[str] | Unset = UNSET
        if not isinstance(self.coins, Unset):
            coins = self.coins




        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if title is not UNSET:
            field_dict["title"] = title
        if source is not UNSET:
            field_dict["source"] = source
        if url is not UNSET:
            field_dict["url"] = url
        if published_at is not UNSET:
            field_dict["publishedAt"] = published_at
        if age_minutes is not UNSET:
            field_dict["ageMinutes"] = age_minutes
        if category is not UNSET:
            field_dict["category"] = category
        if sentiment is not UNSET:
            field_dict["sentiment"] = sentiment
        if sentiment_confidence is not UNSET:
            field_dict["sentimentConfidence"] = sentiment_confidence
        if importance is not UNSET:
            field_dict["importance"] = importance
        if coins is not UNSET:
            field_dict["coins"] = coins

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        title = d.pop("title", UNSET)

        source = d.pop("source", UNSET)

        url = d.pop("url", UNSET)

        _published_at = d.pop("publishedAt", UNSET)
        published_at: datetime.datetime | Unset
        if isinstance(_published_at,  Unset):
            published_at = UNSET
        else:
            published_at = isoparse(_published_at)




        age_minutes = d.pop("ageMinutes", UNSET)

        def _parse_category(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        category = _parse_category(d.pop("category", UNSET))


        def _parse_sentiment(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        sentiment = _parse_sentiment(d.pop("sentiment", UNSET))


        def _parse_sentiment_confidence(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        sentiment_confidence = _parse_sentiment_confidence(d.pop("sentimentConfidence", UNSET))


        def _parse_importance(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        importance = _parse_importance(d.pop("importance", UNSET))


        coins = cast(list[str], d.pop("coins", UNSET))


        get_agent_news_response_200_items_item = cls(
            title=title,
            source=source,
            url=url,
            published_at=published_at,
            age_minutes=age_minutes,
            category=category,
            sentiment=sentiment,
            sentiment_confidence=sentiment_confidence,
            importance=importance,
            coins=coins,
        )


        get_agent_news_response_200_items_item.additional_properties = d
        return get_agent_news_response_200_items_item

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
