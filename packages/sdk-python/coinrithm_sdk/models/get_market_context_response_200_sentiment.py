from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="GetMarketContextResponse200Sentiment")


@_attrs_define
class GetMarketContextResponse200Sentiment:
    """
    Attributes:
        bullish_votes (int | Unset):
        bearish_votes (int | Unset):
        total_votes (int | Unset):
        bullish_pct (int | None | Unset):
        day_utc (datetime.datetime | None | Unset): UTC day of this vote cohort; may be older than the response or
            price.
        updated_at (datetime.datetime | None | Unset): Last write to this vote cohort; not the price clock.
    """

    bullish_votes: int | Unset = UNSET
    bearish_votes: int | Unset = UNSET
    total_votes: int | Unset = UNSET
    bullish_pct: int | None | Unset = UNSET
    day_utc: datetime.datetime | None | Unset = UNSET
    updated_at: datetime.datetime | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        bullish_votes = self.bullish_votes

        bearish_votes = self.bearish_votes

        total_votes = self.total_votes

        bullish_pct: int | None | Unset
        if isinstance(self.bullish_pct, Unset):
            bullish_pct = UNSET
        else:
            bullish_pct = self.bullish_pct

        day_utc: None | str | Unset
        if isinstance(self.day_utc, Unset):
            day_utc = UNSET
        elif isinstance(self.day_utc, datetime.datetime):
            day_utc = self.day_utc.isoformat()
        else:
            day_utc = self.day_utc

        updated_at: None | str | Unset
        if isinstance(self.updated_at, Unset):
            updated_at = UNSET
        elif isinstance(self.updated_at, datetime.datetime):
            updated_at = self.updated_at.isoformat()
        else:
            updated_at = self.updated_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if bullish_votes is not UNSET:
            field_dict["bullishVotes"] = bullish_votes
        if bearish_votes is not UNSET:
            field_dict["bearishVotes"] = bearish_votes
        if total_votes is not UNSET:
            field_dict["totalVotes"] = total_votes
        if bullish_pct is not UNSET:
            field_dict["bullishPct"] = bullish_pct
        if day_utc is not UNSET:
            field_dict["dayUtc"] = day_utc
        if updated_at is not UNSET:
            field_dict["updatedAt"] = updated_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        bullish_votes = d.pop("bullishVotes", UNSET)

        bearish_votes = d.pop("bearishVotes", UNSET)

        total_votes = d.pop("totalVotes", UNSET)

        def _parse_bullish_pct(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        bullish_pct = _parse_bullish_pct(d.pop("bullishPct", UNSET))

        def _parse_day_utc(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                day_utc_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return day_utc_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        day_utc = _parse_day_utc(d.pop("dayUtc", UNSET))

        def _parse_updated_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                updated_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return updated_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        updated_at = _parse_updated_at(d.pop("updatedAt", UNSET))

        get_market_context_response_200_sentiment = cls(
            bullish_votes=bullish_votes,
            bearish_votes=bearish_votes,
            total_votes=total_votes,
            bullish_pct=bullish_pct,
            day_utc=day_utc,
            updated_at=updated_at,
        )

        get_market_context_response_200_sentiment.additional_properties = d
        return get_market_context_response_200_sentiment

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
