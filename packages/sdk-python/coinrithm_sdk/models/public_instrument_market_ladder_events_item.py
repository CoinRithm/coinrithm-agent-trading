from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicInstrumentMarketLadderEventsItem")


@_attrs_define
class PublicInstrumentMarketLadderEventsItem:
    """
    Attributes:
        source (str | Unset):
        slug (str | Unset):
        title (str | Unset):
        path (str | Unset):
        source_url (None | str | Unset):
        volume_24_h_usd (float | None | Unset):
        liquidity_usd (float | None | Unset):
        open_interest_usd (float | None | Unset):
    """

    source: str | Unset = UNSET
    slug: str | Unset = UNSET
    title: str | Unset = UNSET
    path: str | Unset = UNSET
    source_url: None | str | Unset = UNSET
    volume_24_h_usd: float | None | Unset = UNSET
    liquidity_usd: float | None | Unset = UNSET
    open_interest_usd: float | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        source = self.source

        slug = self.slug

        title = self.title

        path = self.path

        source_url: None | str | Unset
        if isinstance(self.source_url, Unset):
            source_url = UNSET
        else:
            source_url = self.source_url

        volume_24_h_usd: float | None | Unset
        if isinstance(self.volume_24_h_usd, Unset):
            volume_24_h_usd = UNSET
        else:
            volume_24_h_usd = self.volume_24_h_usd

        liquidity_usd: float | None | Unset
        if isinstance(self.liquidity_usd, Unset):
            liquidity_usd = UNSET
        else:
            liquidity_usd = self.liquidity_usd

        open_interest_usd: float | None | Unset
        if isinstance(self.open_interest_usd, Unset):
            open_interest_usd = UNSET
        else:
            open_interest_usd = self.open_interest_usd

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if source is not UNSET:
            field_dict["source"] = source
        if slug is not UNSET:
            field_dict["slug"] = slug
        if title is not UNSET:
            field_dict["title"] = title
        if path is not UNSET:
            field_dict["path"] = path
        if source_url is not UNSET:
            field_dict["sourceUrl"] = source_url
        if volume_24_h_usd is not UNSET:
            field_dict["volume24hUsd"] = volume_24_h_usd
        if liquidity_usd is not UNSET:
            field_dict["liquidityUsd"] = liquidity_usd
        if open_interest_usd is not UNSET:
            field_dict["openInterestUsd"] = open_interest_usd

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        source = d.pop("source", UNSET)

        slug = d.pop("slug", UNSET)

        title = d.pop("title", UNSET)

        path = d.pop("path", UNSET)

        def _parse_source_url(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        source_url = _parse_source_url(d.pop("sourceUrl", UNSET))

        def _parse_volume_24_h_usd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        volume_24_h_usd = _parse_volume_24_h_usd(d.pop("volume24hUsd", UNSET))

        def _parse_liquidity_usd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        liquidity_usd = _parse_liquidity_usd(d.pop("liquidityUsd", UNSET))

        def _parse_open_interest_usd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        open_interest_usd = _parse_open_interest_usd(d.pop("openInterestUsd", UNSET))

        public_instrument_market_ladder_events_item = cls(
            source=source,
            slug=slug,
            title=title,
            path=path,
            source_url=source_url,
            volume_24_h_usd=volume_24_h_usd,
            liquidity_usd=liquidity_usd,
            open_interest_usd=open_interest_usd,
        )

        public_instrument_market_ladder_events_item.additional_properties = d
        return public_instrument_market_ladder_events_item

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
