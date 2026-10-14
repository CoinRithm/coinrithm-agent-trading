from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_tradfi_reference_corporate_events_last_earnings_type_0 import (
        PublicTradfiReferenceCorporateEventsLastEarningsType0,
    )
    from ..models.public_tradfi_reference_corporate_events_next_earnings_estimate_type_0 import (
        PublicTradfiReferenceCorporateEventsNextEarningsEstimateType0,
    )
    from ..models.public_tradfi_reference_corporate_events_source import PublicTradfiReferenceCorporateEventsSource
    from ..models.public_tradfi_reference_dividend_event import PublicTradfiReferenceDividendEvent


T = TypeVar("T", bound="PublicTradfiReferenceCorporateEvents")


@_attrs_define
class PublicTradfiReferenceCorporateEvents:
    """
    Attributes:
        last_earnings (None | PublicTradfiReferenceCorporateEventsLastEarningsType0): Latest Item 2.02 earnings release
            8-K, or null.
        next_earnings_estimate (None | PublicTradfiReferenceCorporateEventsNextEarningsEstimateType0): An ESTIMATE,
            never an announced date: the last release plus the
            median gap, only with at least 3 consecutive releases 80-100 days
            apart and while the date is not past. Otherwise null.
        dividends (list[PublicTradfiReferenceDividendEvent]): Up to 4 dividend declarations found in 8-K text, newest
            first.
            Issuers that announce dividends only by press release (e.g. KO,
            MSFT, JPM) have an empty list.
        upcoming_dividend (None | PublicTradfiReferenceDividendEvent): The newest declaration whose `payableDate` is
            today or later, else null.
        source (PublicTradfiReferenceCorporateEventsSource):
    """

    last_earnings: None | PublicTradfiReferenceCorporateEventsLastEarningsType0
    next_earnings_estimate: None | PublicTradfiReferenceCorporateEventsNextEarningsEstimateType0
    dividends: list[PublicTradfiReferenceDividendEvent]
    upcoming_dividend: None | PublicTradfiReferenceDividendEvent
    source: PublicTradfiReferenceCorporateEventsSource
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_tradfi_reference_corporate_events_last_earnings_type_0 import (
            PublicTradfiReferenceCorporateEventsLastEarningsType0,
        )
        from ..models.public_tradfi_reference_corporate_events_next_earnings_estimate_type_0 import (
            PublicTradfiReferenceCorporateEventsNextEarningsEstimateType0,
        )
        from ..models.public_tradfi_reference_dividend_event import PublicTradfiReferenceDividendEvent

        last_earnings: dict[str, Any] | None
        if isinstance(self.last_earnings, PublicTradfiReferenceCorporateEventsLastEarningsType0):
            last_earnings = self.last_earnings.to_dict()
        else:
            last_earnings = self.last_earnings

        next_earnings_estimate: dict[str, Any] | None
        if isinstance(self.next_earnings_estimate, PublicTradfiReferenceCorporateEventsNextEarningsEstimateType0):
            next_earnings_estimate = self.next_earnings_estimate.to_dict()
        else:
            next_earnings_estimate = self.next_earnings_estimate

        dividends = []
        for dividends_item_data in self.dividends:
            dividends_item = dividends_item_data.to_dict()
            dividends.append(dividends_item)

        upcoming_dividend: dict[str, Any] | None
        if isinstance(self.upcoming_dividend, PublicTradfiReferenceDividendEvent):
            upcoming_dividend = self.upcoming_dividend.to_dict()
        else:
            upcoming_dividend = self.upcoming_dividend

        source = self.source.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "lastEarnings": last_earnings,
                "nextEarningsEstimate": next_earnings_estimate,
                "dividends": dividends,
                "upcomingDividend": upcoming_dividend,
                "source": source,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_tradfi_reference_corporate_events_last_earnings_type_0 import (
            PublicTradfiReferenceCorporateEventsLastEarningsType0,
        )
        from ..models.public_tradfi_reference_corporate_events_next_earnings_estimate_type_0 import (
            PublicTradfiReferenceCorporateEventsNextEarningsEstimateType0,
        )
        from ..models.public_tradfi_reference_corporate_events_source import PublicTradfiReferenceCorporateEventsSource
        from ..models.public_tradfi_reference_dividend_event import PublicTradfiReferenceDividendEvent

        d = dict(src_dict)

        def _parse_last_earnings(data: object) -> None | PublicTradfiReferenceCorporateEventsLastEarningsType0:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                last_earnings_type_0 = PublicTradfiReferenceCorporateEventsLastEarningsType0.from_dict(data)

                return last_earnings_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicTradfiReferenceCorporateEventsLastEarningsType0, data)

        last_earnings = _parse_last_earnings(d.pop("lastEarnings"))

        def _parse_next_earnings_estimate(
            data: object,
        ) -> None | PublicTradfiReferenceCorporateEventsNextEarningsEstimateType0:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                next_earnings_estimate_type_0 = PublicTradfiReferenceCorporateEventsNextEarningsEstimateType0.from_dict(
                    data
                )

                return next_earnings_estimate_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicTradfiReferenceCorporateEventsNextEarningsEstimateType0, data)

        next_earnings_estimate = _parse_next_earnings_estimate(d.pop("nextEarningsEstimate"))

        dividends = []
        _dividends = d.pop("dividends")
        for dividends_item_data in _dividends:
            dividends_item = PublicTradfiReferenceDividendEvent.from_dict(dividends_item_data)

            dividends.append(dividends_item)

        def _parse_upcoming_dividend(data: object) -> None | PublicTradfiReferenceDividendEvent:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                upcoming_dividend_type_0 = PublicTradfiReferenceDividendEvent.from_dict(data)

                return upcoming_dividend_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicTradfiReferenceDividendEvent, data)

        upcoming_dividend = _parse_upcoming_dividend(d.pop("upcomingDividend"))

        source = PublicTradfiReferenceCorporateEventsSource.from_dict(d.pop("source"))

        public_tradfi_reference_corporate_events = cls(
            last_earnings=last_earnings,
            next_earnings_estimate=next_earnings_estimate,
            dividends=dividends,
            upcoming_dividend=upcoming_dividend,
            source=source,
        )

        public_tradfi_reference_corporate_events.additional_properties = d
        return public_tradfi_reference_corporate_events

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
