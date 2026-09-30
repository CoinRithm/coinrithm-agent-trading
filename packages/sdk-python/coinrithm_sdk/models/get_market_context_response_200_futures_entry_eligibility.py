from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.get_market_context_response_200_futures_entry_eligibility_status import (
    GetMarketContextResponse200FuturesEntryEligibilityStatus,
)
from ..types import UNSET, Unset

T = TypeVar("T", bound="GetMarketContextResponse200FuturesEntryEligibility")


@_attrs_define
class GetMarketContextResponse200FuturesEntryEligibility:
    """What the server entry gate's perpetual-reference rule says
    about a NEW futures open on this coin right now (backend-v2
    #106). Informational: quote/open re-check at execution,
    and eligibility can change in between. Adds to and closes
    of an existing position are never refused for it.
    `reference_unavailable` states that CoinRithm holds no
    supported perpetual reference for the coin, not that no
    perpetual exists anywhere. Absent on older API versions.

        Attributes:
            status (GetMarketContextResponse200FuturesEntryEligibilityStatus):
            reference_required (bool): Whether the gate currently requires a reference for NEW opens.
            max_reference_age_hours (float):
            evaluated_at (datetime.datetime):
            venue (None | str | Unset):
            symbol (None | str | Unset):
            reference_fetched_at (datetime.datetime | None | Unset):
    """

    status: GetMarketContextResponse200FuturesEntryEligibilityStatus
    reference_required: bool
    max_reference_age_hours: float
    evaluated_at: datetime.datetime
    venue: None | str | Unset = UNSET
    symbol: None | str | Unset = UNSET
    reference_fetched_at: datetime.datetime | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        status = self.status.value

        reference_required = self.reference_required

        max_reference_age_hours = self.max_reference_age_hours

        evaluated_at = self.evaluated_at.isoformat()

        venue: None | str | Unset
        if isinstance(self.venue, Unset):
            venue = UNSET
        else:
            venue = self.venue

        symbol: None | str | Unset
        if isinstance(self.symbol, Unset):
            symbol = UNSET
        else:
            symbol = self.symbol

        reference_fetched_at: None | str | Unset
        if isinstance(self.reference_fetched_at, Unset):
            reference_fetched_at = UNSET
        elif isinstance(self.reference_fetched_at, datetime.datetime):
            reference_fetched_at = self.reference_fetched_at.isoformat()
        else:
            reference_fetched_at = self.reference_fetched_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "status": status,
                "referenceRequired": reference_required,
                "maxReferenceAgeHours": max_reference_age_hours,
                "evaluatedAt": evaluated_at,
            }
        )
        if venue is not UNSET:
            field_dict["venue"] = venue
        if symbol is not UNSET:
            field_dict["symbol"] = symbol
        if reference_fetched_at is not UNSET:
            field_dict["referenceFetchedAt"] = reference_fetched_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        status = GetMarketContextResponse200FuturesEntryEligibilityStatus(d.pop("status"))

        reference_required = d.pop("referenceRequired")

        max_reference_age_hours = d.pop("maxReferenceAgeHours")

        evaluated_at = datetime.datetime.fromisoformat(d.pop("evaluatedAt").replace("Z", "+00:00"))

        def _parse_venue(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        venue = _parse_venue(d.pop("venue", UNSET))

        def _parse_symbol(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        symbol = _parse_symbol(d.pop("symbol", UNSET))

        def _parse_reference_fetched_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                reference_fetched_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return reference_fetched_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        reference_fetched_at = _parse_reference_fetched_at(d.pop("referenceFetchedAt", UNSET))

        get_market_context_response_200_futures_entry_eligibility = cls(
            status=status,
            reference_required=reference_required,
            max_reference_age_hours=max_reference_age_hours,
            evaluated_at=evaluated_at,
            venue=venue,
            symbol=symbol,
            reference_fetched_at=reference_fetched_at,
        )

        get_market_context_response_200_futures_entry_eligibility.additional_properties = d
        return get_market_context_response_200_futures_entry_eligibility

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
