from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_instrument_market_ladder_observation import PublicInstrumentMarketLadderObservation
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_instrument_market_contract import PublicInstrumentMarketContract
    from ..models.public_instrument_market_ladder_events_item import PublicInstrumentMarketLadderEventsItem


T = TypeVar("T", bound="PublicInstrumentMarketLadder")


@_attrs_define
class PublicInstrumentMarketLadder:
    """
    Attributes:
        venue (str):
        venue_name (str):
        series (str):
        expires_at (datetime.datetime):
        observation (PublicInstrumentMarketLadderObservation):
        settlement_source (str):
        settlement_note (str):
        reference_relation (str): For example `same_asset_different_feed`, `futures_vs_spot`, `proxy_perp`.
        monotonic (bool): False when the venue's traded prices disagree across strikes.
        contracts (list[PublicInstrumentMarketContract]):
        window_start_at (datetime.datetime | None | Unset): Null on a touch ladder means the venue's own window rules
            apply.
        metric (str | Unset): For example `spot_price` or `futures_settle`.
        reference_note (None | str | Unset):
        as_of (datetime.datetime | None | Unset): The venue lane's last observation time.
        as_of_basis (str | Unset):
        events (list[PublicInstrumentMarketLadderEventsItem] | Unset):
    """

    venue: str
    venue_name: str
    series: str
    expires_at: datetime.datetime
    observation: PublicInstrumentMarketLadderObservation
    settlement_source: str
    settlement_note: str
    reference_relation: str
    monotonic: bool
    contracts: list[PublicInstrumentMarketContract]
    window_start_at: datetime.datetime | None | Unset = UNSET
    metric: str | Unset = UNSET
    reference_note: None | str | Unset = UNSET
    as_of: datetime.datetime | None | Unset = UNSET
    as_of_basis: str | Unset = UNSET
    events: list[PublicInstrumentMarketLadderEventsItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        venue = self.venue

        venue_name = self.venue_name

        series = self.series

        expires_at = self.expires_at.isoformat()

        observation = self.observation.value

        settlement_source = self.settlement_source

        settlement_note = self.settlement_note

        reference_relation = self.reference_relation

        monotonic = self.monotonic

        contracts = []
        for contracts_item_data in self.contracts:
            contracts_item = contracts_item_data.to_dict()
            contracts.append(contracts_item)

        window_start_at: None | str | Unset
        if isinstance(self.window_start_at, Unset):
            window_start_at = UNSET
        elif isinstance(self.window_start_at, datetime.datetime):
            window_start_at = self.window_start_at.isoformat()
        else:
            window_start_at = self.window_start_at

        metric = self.metric

        reference_note: None | str | Unset
        if isinstance(self.reference_note, Unset):
            reference_note = UNSET
        else:
            reference_note = self.reference_note

        as_of: None | str | Unset
        if isinstance(self.as_of, Unset):
            as_of = UNSET
        elif isinstance(self.as_of, datetime.datetime):
            as_of = self.as_of.isoformat()
        else:
            as_of = self.as_of

        as_of_basis = self.as_of_basis

        events: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.events, Unset):
            events = []
            for events_item_data in self.events:
                events_item = events_item_data.to_dict()
                events.append(events_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "venue": venue,
                "venueName": venue_name,
                "series": series,
                "expiresAt": expires_at,
                "observation": observation,
                "settlementSource": settlement_source,
                "settlementNote": settlement_note,
                "referenceRelation": reference_relation,
                "monotonic": monotonic,
                "contracts": contracts,
            }
        )
        if window_start_at is not UNSET:
            field_dict["windowStartAt"] = window_start_at
        if metric is not UNSET:
            field_dict["metric"] = metric
        if reference_note is not UNSET:
            field_dict["referenceNote"] = reference_note
        if as_of is not UNSET:
            field_dict["asOf"] = as_of
        if as_of_basis is not UNSET:
            field_dict["asOfBasis"] = as_of_basis
        if events is not UNSET:
            field_dict["events"] = events

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_instrument_market_contract import PublicInstrumentMarketContract
        from ..models.public_instrument_market_ladder_events_item import PublicInstrumentMarketLadderEventsItem

        d = dict(src_dict)
        venue = d.pop("venue")

        venue_name = d.pop("venueName")

        series = d.pop("series")

        expires_at = datetime.datetime.fromisoformat(d.pop("expiresAt").replace("Z", "+00:00"))

        observation = PublicInstrumentMarketLadderObservation(d.pop("observation"))

        settlement_source = d.pop("settlementSource")

        settlement_note = d.pop("settlementNote")

        reference_relation = d.pop("referenceRelation")

        monotonic = d.pop("monotonic")

        contracts = []
        _contracts = d.pop("contracts")
        for contracts_item_data in _contracts:
            contracts_item = PublicInstrumentMarketContract.from_dict(contracts_item_data)

            contracts.append(contracts_item)

        def _parse_window_start_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                window_start_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return window_start_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        window_start_at = _parse_window_start_at(d.pop("windowStartAt", UNSET))

        metric = d.pop("metric", UNSET)

        def _parse_reference_note(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        reference_note = _parse_reference_note(d.pop("referenceNote", UNSET))

        def _parse_as_of(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                as_of_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return as_of_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        as_of = _parse_as_of(d.pop("asOf", UNSET))

        as_of_basis = d.pop("asOfBasis", UNSET)

        _events = d.pop("events", UNSET)
        events: list[PublicInstrumentMarketLadderEventsItem] | Unset = UNSET
        if _events is not UNSET:
            events = []
            for events_item_data in _events:
                events_item = PublicInstrumentMarketLadderEventsItem.from_dict(events_item_data)

                events.append(events_item)

        public_instrument_market_ladder = cls(
            venue=venue,
            venue_name=venue_name,
            series=series,
            expires_at=expires_at,
            observation=observation,
            settlement_source=settlement_source,
            settlement_note=settlement_note,
            reference_relation=reference_relation,
            monotonic=monotonic,
            contracts=contracts,
            window_start_at=window_start_at,
            metric=metric,
            reference_note=reference_note,
            as_of=as_of,
            as_of_basis=as_of_basis,
            events=events,
        )

        public_instrument_market_ladder.additional_properties = d
        return public_instrument_market_ladder

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
