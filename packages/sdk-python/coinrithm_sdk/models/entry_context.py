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






T = TypeVar("T", bound="EntryContext")



@_attrs_define
class EntryContext:
    """ Compact, versioned market microstructure snapshot frozen onto a paper PM
    position at open (decision) time — the durable research record of what the
    market looked like when the agent acted. Every market field is nullable:
    null = not observed at entry (a field the live snapshot lacked, or an
    event outside a cross-venue cluster), never a fabricated zero.

        Attributes:
            v (int | Unset): Snapshot schema version (currently 1).
            captured_at (datetime.datetime | Unset): Decision/open time (server clock).
            market_as_of (datetime.datetime | None | Unset): Freshness of the market data feeding this snapshot.
            chosen_probability (float | None | Unset): The chosen outcome's raw market-implied probability at entry, 0-100.
            volume24h (float | None | Unset):
            liquidity (float | None | Unset):
            spread (float | None | Unset): Bid-ask spread in probability points at entry.
            best_bid (float | None | Unset): Best bid in probability points.
            best_ask (float | None | Unset): Best ask in probability points.
            reference_probability (float | None | Unset): Cross-venue liquidity-weighted median reference probability
                (0-100).
            reference_venue_count (int | None | Unset): Real-money venues behind referenceProbability.
     """

    v: int | Unset = UNSET
    captured_at: datetime.datetime | Unset = UNSET
    market_as_of: datetime.datetime | None | Unset = UNSET
    chosen_probability: float | None | Unset = UNSET
    volume24h: float | None | Unset = UNSET
    liquidity: float | None | Unset = UNSET
    spread: float | None | Unset = UNSET
    best_bid: float | None | Unset = UNSET
    best_ask: float | None | Unset = UNSET
    reference_probability: float | None | Unset = UNSET
    reference_venue_count: int | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        v = self.v

        captured_at: str | Unset = UNSET
        if not isinstance(self.captured_at, Unset):
            captured_at = self.captured_at.isoformat()

        market_as_of: None | str | Unset
        if isinstance(self.market_as_of, Unset):
            market_as_of = UNSET
        elif isinstance(self.market_as_of, datetime.datetime):
            market_as_of = self.market_as_of.isoformat()
        else:
            market_as_of = self.market_as_of

        chosen_probability: float | None | Unset
        if isinstance(self.chosen_probability, Unset):
            chosen_probability = UNSET
        else:
            chosen_probability = self.chosen_probability

        volume24h: float | None | Unset
        if isinstance(self.volume24h, Unset):
            volume24h = UNSET
        else:
            volume24h = self.volume24h

        liquidity: float | None | Unset
        if isinstance(self.liquidity, Unset):
            liquidity = UNSET
        else:
            liquidity = self.liquidity

        spread: float | None | Unset
        if isinstance(self.spread, Unset):
            spread = UNSET
        else:
            spread = self.spread

        best_bid: float | None | Unset
        if isinstance(self.best_bid, Unset):
            best_bid = UNSET
        else:
            best_bid = self.best_bid

        best_ask: float | None | Unset
        if isinstance(self.best_ask, Unset):
            best_ask = UNSET
        else:
            best_ask = self.best_ask

        reference_probability: float | None | Unset
        if isinstance(self.reference_probability, Unset):
            reference_probability = UNSET
        else:
            reference_probability = self.reference_probability

        reference_venue_count: int | None | Unset
        if isinstance(self.reference_venue_count, Unset):
            reference_venue_count = UNSET
        else:
            reference_venue_count = self.reference_venue_count


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if v is not UNSET:
            field_dict["v"] = v
        if captured_at is not UNSET:
            field_dict["capturedAt"] = captured_at
        if market_as_of is not UNSET:
            field_dict["marketAsOf"] = market_as_of
        if chosen_probability is not UNSET:
            field_dict["chosenProbability"] = chosen_probability
        if volume24h is not UNSET:
            field_dict["volume24h"] = volume24h
        if liquidity is not UNSET:
            field_dict["liquidity"] = liquidity
        if spread is not UNSET:
            field_dict["spread"] = spread
        if best_bid is not UNSET:
            field_dict["bestBid"] = best_bid
        if best_ask is not UNSET:
            field_dict["bestAsk"] = best_ask
        if reference_probability is not UNSET:
            field_dict["referenceProbability"] = reference_probability
        if reference_venue_count is not UNSET:
            field_dict["referenceVenueCount"] = reference_venue_count

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        v = d.pop("v", UNSET)

        _captured_at = d.pop("capturedAt", UNSET)
        captured_at: datetime.datetime | Unset
        if isinstance(_captured_at,  Unset):
            captured_at = UNSET
        else:
            captured_at = isoparse(_captured_at)




        def _parse_market_as_of(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                market_as_of_type_0 = isoparse(data)



                return market_as_of_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        market_as_of = _parse_market_as_of(d.pop("marketAsOf", UNSET))


        def _parse_chosen_probability(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        chosen_probability = _parse_chosen_probability(d.pop("chosenProbability", UNSET))


        def _parse_volume24h(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        volume24h = _parse_volume24h(d.pop("volume24h", UNSET))


        def _parse_liquidity(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        liquidity = _parse_liquidity(d.pop("liquidity", UNSET))


        def _parse_spread(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        spread = _parse_spread(d.pop("spread", UNSET))


        def _parse_best_bid(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        best_bid = _parse_best_bid(d.pop("bestBid", UNSET))


        def _parse_best_ask(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        best_ask = _parse_best_ask(d.pop("bestAsk", UNSET))


        def _parse_reference_probability(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        reference_probability = _parse_reference_probability(d.pop("referenceProbability", UNSET))


        def _parse_reference_venue_count(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        reference_venue_count = _parse_reference_venue_count(d.pop("referenceVenueCount", UNSET))


        entry_context = cls(
            v=v,
            captured_at=captured_at,
            market_as_of=market_as_of,
            chosen_probability=chosen_probability,
            volume24h=volume24h,
            liquidity=liquidity,
            spread=spread,
            best_bid=best_bid,
            best_ask=best_ask,
            reference_probability=reference_probability,
            reference_venue_count=reference_venue_count,
        )


        entry_context.additional_properties = d
        return entry_context

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
