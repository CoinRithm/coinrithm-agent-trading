from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_liquidation_event import PublicLiquidationEvent
    from ..models.public_liquidation_totals import PublicLiquidationTotals
    from ..models.public_liquidation_venue_summary import PublicLiquidationVenueSummary
    from ..models.public_liquidations_window import PublicLiquidationsWindow
    from ..models.public_market_feed_source import PublicMarketFeedSource


T = TypeVar("T", bound="PublicLiquidationsResponse")


@_attrs_define
class PublicLiquidationsResponse:
    """
    Attributes:
        version (int):
        generated_at (datetime.datetime):
        base (str):
        venue (None | str): The venue filter applied, or null for every captured venue.
        window (PublicLiquidationsWindow):
        totals (PublicLiquidationTotals): Captured liquidation sums in USD (rounded to whole dollars) and event counts.
        venues (list[PublicLiquidationVenueSummary]): One entry per venue with captured events in the window.
        biggest (list[PublicLiquidationEvent]): Largest events by notional.
        latest (list[PublicLiquidationEvent]): Most recent events.
        truncated (bool): True when the row cap was reached; totals are then a lower bound.
        source (PublicMarketFeedSource):
    """

    version: int
    generated_at: datetime.datetime
    base: str
    venue: None | str
    window: PublicLiquidationsWindow
    totals: PublicLiquidationTotals
    venues: list[PublicLiquidationVenueSummary]
    biggest: list[PublicLiquidationEvent]
    latest: list[PublicLiquidationEvent]
    truncated: bool
    source: PublicMarketFeedSource
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        version = self.version

        generated_at = self.generated_at.isoformat()

        base = self.base

        venue: None | str
        venue = self.venue

        window = self.window.to_dict()

        totals = self.totals.to_dict()

        venues = []
        for venues_item_data in self.venues:
            venues_item = venues_item_data.to_dict()
            venues.append(venues_item)

        biggest = []
        for biggest_item_data in self.biggest:
            biggest_item = biggest_item_data.to_dict()
            biggest.append(biggest_item)

        latest = []
        for latest_item_data in self.latest:
            latest_item = latest_item_data.to_dict()
            latest.append(latest_item)

        truncated = self.truncated

        source = self.source.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "version": version,
                "generatedAt": generated_at,
                "base": base,
                "venue": venue,
                "window": window,
                "totals": totals,
                "venues": venues,
                "biggest": biggest,
                "latest": latest,
                "truncated": truncated,
                "source": source,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_liquidation_event import PublicLiquidationEvent
        from ..models.public_liquidation_totals import PublicLiquidationTotals
        from ..models.public_liquidation_venue_summary import PublicLiquidationVenueSummary
        from ..models.public_liquidations_window import PublicLiquidationsWindow
        from ..models.public_market_feed_source import PublicMarketFeedSource

        d = dict(src_dict)
        version = d.pop("version")

        generated_at = datetime.datetime.fromisoformat(d.pop("generatedAt").replace("Z", "+00:00"))

        base = d.pop("base")

        def _parse_venue(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        venue = _parse_venue(d.pop("venue"))

        window = PublicLiquidationsWindow.from_dict(d.pop("window"))

        totals = PublicLiquidationTotals.from_dict(d.pop("totals"))

        venues = []
        _venues = d.pop("venues")
        for venues_item_data in _venues:
            venues_item = PublicLiquidationVenueSummary.from_dict(venues_item_data)

            venues.append(venues_item)

        biggest = []
        _biggest = d.pop("biggest")
        for biggest_item_data in _biggest:
            biggest_item = PublicLiquidationEvent.from_dict(biggest_item_data)

            biggest.append(biggest_item)

        latest = []
        _latest = d.pop("latest")
        for latest_item_data in _latest:
            latest_item = PublicLiquidationEvent.from_dict(latest_item_data)

            latest.append(latest_item)

        truncated = d.pop("truncated")

        source = PublicMarketFeedSource.from_dict(d.pop("source"))

        public_liquidations_response = cls(
            version=version,
            generated_at=generated_at,
            base=base,
            venue=venue,
            window=window,
            totals=totals,
            venues=venues,
            biggest=biggest,
            latest=latest,
            truncated=truncated,
            source=source,
        )

        public_liquidations_response.additional_properties = d
        return public_liquidations_response

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
