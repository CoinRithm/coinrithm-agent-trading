from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_whale_trade_event_market_outcomes_type_0 import PublicPmWhaleTradeEventMarketOutcomesType0


T = TypeVar("T", bound="PublicPmWhaleTradeEvent")


@_attrs_define
class PublicPmWhaleTradeEvent:
    """The event this trade belongs to. Sent on `/whales` and SSE `whale` rows, not on event detail.

    Attributes:
        source (str | Unset):
        slug (str | Unset):
        title (str | Unset):
        image (None | str | Unset):
        source_name (str | Unset):
        source_icon (None | str | Unset):
        market_outcomes (None | PublicPmWhaleTradeEventMarketOutcomesType0 | Unset): Outcome count and the top outcomes
            by probability, for a market-split display.
    """

    source: str | Unset = UNSET
    slug: str | Unset = UNSET
    title: str | Unset = UNSET
    image: None | str | Unset = UNSET
    source_name: str | Unset = UNSET
    source_icon: None | str | Unset = UNSET
    market_outcomes: None | PublicPmWhaleTradeEventMarketOutcomesType0 | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_pm_whale_trade_event_market_outcomes_type_0 import (
            PublicPmWhaleTradeEventMarketOutcomesType0,
        )

        source = self.source

        slug = self.slug

        title = self.title

        image: None | str | Unset
        if isinstance(self.image, Unset):
            image = UNSET
        else:
            image = self.image

        source_name = self.source_name

        source_icon: None | str | Unset
        if isinstance(self.source_icon, Unset):
            source_icon = UNSET
        else:
            source_icon = self.source_icon

        market_outcomes: dict[str, Any] | None | Unset
        if isinstance(self.market_outcomes, Unset):
            market_outcomes = UNSET
        elif isinstance(self.market_outcomes, PublicPmWhaleTradeEventMarketOutcomesType0):
            market_outcomes = self.market_outcomes.to_dict()
        else:
            market_outcomes = self.market_outcomes

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if source is not UNSET:
            field_dict["source"] = source
        if slug is not UNSET:
            field_dict["slug"] = slug
        if title is not UNSET:
            field_dict["title"] = title
        if image is not UNSET:
            field_dict["image"] = image
        if source_name is not UNSET:
            field_dict["sourceName"] = source_name
        if source_icon is not UNSET:
            field_dict["sourceIcon"] = source_icon
        if market_outcomes is not UNSET:
            field_dict["marketOutcomes"] = market_outcomes

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_whale_trade_event_market_outcomes_type_0 import (
            PublicPmWhaleTradeEventMarketOutcomesType0,
        )

        d = dict(src_dict)
        source = d.pop("source", UNSET)

        slug = d.pop("slug", UNSET)

        title = d.pop("title", UNSET)

        def _parse_image(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        image = _parse_image(d.pop("image", UNSET))

        source_name = d.pop("sourceName", UNSET)

        def _parse_source_icon(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        source_icon = _parse_source_icon(d.pop("sourceIcon", UNSET))

        def _parse_market_outcomes(data: object) -> None | PublicPmWhaleTradeEventMarketOutcomesType0 | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                market_outcomes_type_0 = PublicPmWhaleTradeEventMarketOutcomesType0.from_dict(data)

                return market_outcomes_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicPmWhaleTradeEventMarketOutcomesType0 | Unset, data)

        market_outcomes = _parse_market_outcomes(d.pop("marketOutcomes", UNSET))

        public_pm_whale_trade_event = cls(
            source=source,
            slug=slug,
            title=title,
            image=image,
            source_name=source_name,
            source_icon=source_icon,
            market_outcomes=market_outcomes,
        )

        public_pm_whale_trade_event.additional_properties = d
        return public_pm_whale_trade_event

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
