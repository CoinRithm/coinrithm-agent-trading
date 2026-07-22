from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.public_pm_event import PublicPmEvent
  from ..models.public_pm_event_detail_response_cross_source_matches_item import PublicPmEventDetailResponseCrossSourceMatchesItem
  from ..models.public_pm_event_detail_response_related_news_item import PublicPmEventDetailResponseRelatedNewsItem
  from ..models.public_pm_event_detail_response_resolution_type_0 import PublicPmEventDetailResponseResolutionType0
  from ..models.public_pm_event_detail_response_snapshots_item import PublicPmEventDetailResponseSnapshotsItem
  from ..models.public_pm_event_detail_response_volume_history_item import PublicPmEventDetailResponseVolumeHistoryItem
  from ..models.public_pm_whale_trade import PublicPmWhaleTrade





T = TypeVar("T", bound="PublicPmEventDetailResponse")



@_attrs_define
class PublicPmEventDetailResponse:
    """ 
        Attributes:
            event (PublicPmEvent):
            snapshots (list[PublicPmEventDetailResponseSnapshotsItem] | Unset):
            related_events (list[PublicPmEvent] | Unset):
            cross_source_matches (list[PublicPmEventDetailResponseCrossSourceMatchesItem] | Unset):
            resolution (None | PublicPmEventDetailResponseResolutionType0 | Unset):
            volume_history (list[PublicPmEventDetailResponseVolumeHistoryItem] | Unset):
            related_news (list[PublicPmEventDetailResponseRelatedNewsItem] | Unset):
            recent_whale_trades (list[PublicPmWhaleTrade] | Unset):
     """

    event: PublicPmEvent
    snapshots: list[PublicPmEventDetailResponseSnapshotsItem] | Unset = UNSET
    related_events: list[PublicPmEvent] | Unset = UNSET
    cross_source_matches: list[PublicPmEventDetailResponseCrossSourceMatchesItem] | Unset = UNSET
    resolution: None | PublicPmEventDetailResponseResolutionType0 | Unset = UNSET
    volume_history: list[PublicPmEventDetailResponseVolumeHistoryItem] | Unset = UNSET
    related_news: list[PublicPmEventDetailResponseRelatedNewsItem] | Unset = UNSET
    recent_whale_trades: list[PublicPmWhaleTrade] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.public_pm_event import PublicPmEvent
        from ..models.public_pm_event_detail_response_cross_source_matches_item import PublicPmEventDetailResponseCrossSourceMatchesItem
        from ..models.public_pm_event_detail_response_related_news_item import PublicPmEventDetailResponseRelatedNewsItem
        from ..models.public_pm_event_detail_response_resolution_type_0 import PublicPmEventDetailResponseResolutionType0
        from ..models.public_pm_event_detail_response_snapshots_item import PublicPmEventDetailResponseSnapshotsItem
        from ..models.public_pm_event_detail_response_volume_history_item import PublicPmEventDetailResponseVolumeHistoryItem
        from ..models.public_pm_whale_trade import PublicPmWhaleTrade
        event = self.event.to_dict()

        snapshots: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.snapshots, Unset):
            snapshots = []
            for snapshots_item_data in self.snapshots:
                snapshots_item = snapshots_item_data.to_dict()
                snapshots.append(snapshots_item)



        related_events: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.related_events, Unset):
            related_events = []
            for related_events_item_data in self.related_events:
                related_events_item = related_events_item_data.to_dict()
                related_events.append(related_events_item)



        cross_source_matches: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.cross_source_matches, Unset):
            cross_source_matches = []
            for cross_source_matches_item_data in self.cross_source_matches:
                cross_source_matches_item = cross_source_matches_item_data.to_dict()
                cross_source_matches.append(cross_source_matches_item)



        resolution: dict[str, Any] | None | Unset
        if isinstance(self.resolution, Unset):
            resolution = UNSET
        elif isinstance(self.resolution, PublicPmEventDetailResponseResolutionType0):
            resolution = self.resolution.to_dict()
        else:
            resolution = self.resolution

        volume_history: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.volume_history, Unset):
            volume_history = []
            for volume_history_item_data in self.volume_history:
                volume_history_item = volume_history_item_data.to_dict()
                volume_history.append(volume_history_item)



        related_news: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.related_news, Unset):
            related_news = []
            for related_news_item_data in self.related_news:
                related_news_item = related_news_item_data.to_dict()
                related_news.append(related_news_item)



        recent_whale_trades: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.recent_whale_trades, Unset):
            recent_whale_trades = []
            for recent_whale_trades_item_data in self.recent_whale_trades:
                recent_whale_trades_item = recent_whale_trades_item_data.to_dict()
                recent_whale_trades.append(recent_whale_trades_item)




        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "event": event,
        })
        if snapshots is not UNSET:
            field_dict["snapshots"] = snapshots
        if related_events is not UNSET:
            field_dict["relatedEvents"] = related_events
        if cross_source_matches is not UNSET:
            field_dict["crossSourceMatches"] = cross_source_matches
        if resolution is not UNSET:
            field_dict["resolution"] = resolution
        if volume_history is not UNSET:
            field_dict["volumeHistory"] = volume_history
        if related_news is not UNSET:
            field_dict["relatedNews"] = related_news
        if recent_whale_trades is not UNSET:
            field_dict["recentWhaleTrades"] = recent_whale_trades

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_event import PublicPmEvent
        from ..models.public_pm_event_detail_response_cross_source_matches_item import PublicPmEventDetailResponseCrossSourceMatchesItem
        from ..models.public_pm_event_detail_response_related_news_item import PublicPmEventDetailResponseRelatedNewsItem
        from ..models.public_pm_event_detail_response_resolution_type_0 import PublicPmEventDetailResponseResolutionType0
        from ..models.public_pm_event_detail_response_snapshots_item import PublicPmEventDetailResponseSnapshotsItem
        from ..models.public_pm_event_detail_response_volume_history_item import PublicPmEventDetailResponseVolumeHistoryItem
        from ..models.public_pm_whale_trade import PublicPmWhaleTrade
        d = dict(src_dict)
        event = PublicPmEvent.from_dict(d.pop("event"))




        _snapshots = d.pop("snapshots", UNSET)
        snapshots: list[PublicPmEventDetailResponseSnapshotsItem] | Unset = UNSET
        if _snapshots is not UNSET:
            snapshots = []
            for snapshots_item_data in _snapshots:
                snapshots_item = PublicPmEventDetailResponseSnapshotsItem.from_dict(snapshots_item_data)



                snapshots.append(snapshots_item)


        _related_events = d.pop("relatedEvents", UNSET)
        related_events: list[PublicPmEvent] | Unset = UNSET
        if _related_events is not UNSET:
            related_events = []
            for related_events_item_data in _related_events:
                related_events_item = PublicPmEvent.from_dict(related_events_item_data)



                related_events.append(related_events_item)


        _cross_source_matches = d.pop("crossSourceMatches", UNSET)
        cross_source_matches: list[PublicPmEventDetailResponseCrossSourceMatchesItem] | Unset = UNSET
        if _cross_source_matches is not UNSET:
            cross_source_matches = []
            for cross_source_matches_item_data in _cross_source_matches:
                cross_source_matches_item = PublicPmEventDetailResponseCrossSourceMatchesItem.from_dict(cross_source_matches_item_data)



                cross_source_matches.append(cross_source_matches_item)


        def _parse_resolution(data: object) -> None | PublicPmEventDetailResponseResolutionType0 | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                resolution_type_0 = PublicPmEventDetailResponseResolutionType0.from_dict(data)



                return resolution_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicPmEventDetailResponseResolutionType0 | Unset, data)

        resolution = _parse_resolution(d.pop("resolution", UNSET))


        _volume_history = d.pop("volumeHistory", UNSET)
        volume_history: list[PublicPmEventDetailResponseVolumeHistoryItem] | Unset = UNSET
        if _volume_history is not UNSET:
            volume_history = []
            for volume_history_item_data in _volume_history:
                volume_history_item = PublicPmEventDetailResponseVolumeHistoryItem.from_dict(volume_history_item_data)



                volume_history.append(volume_history_item)


        _related_news = d.pop("relatedNews", UNSET)
        related_news: list[PublicPmEventDetailResponseRelatedNewsItem] | Unset = UNSET
        if _related_news is not UNSET:
            related_news = []
            for related_news_item_data in _related_news:
                related_news_item = PublicPmEventDetailResponseRelatedNewsItem.from_dict(related_news_item_data)



                related_news.append(related_news_item)


        _recent_whale_trades = d.pop("recentWhaleTrades", UNSET)
        recent_whale_trades: list[PublicPmWhaleTrade] | Unset = UNSET
        if _recent_whale_trades is not UNSET:
            recent_whale_trades = []
            for recent_whale_trades_item_data in _recent_whale_trades:
                recent_whale_trades_item = PublicPmWhaleTrade.from_dict(recent_whale_trades_item_data)



                recent_whale_trades.append(recent_whale_trades_item)


        public_pm_event_detail_response = cls(
            event=event,
            snapshots=snapshots,
            related_events=related_events,
            cross_source_matches=cross_source_matches,
            resolution=resolution,
            volume_history=volume_history,
            related_news=related_news,
            recent_whale_trades=recent_whale_trades,
        )


        public_pm_event_detail_response.additional_properties = d
        return public_pm_event_detail_response

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
