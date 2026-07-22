from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.public_pm_source_slug import PublicPmSourceSlug
from ..models.public_pm_whale_trade_availability import PublicPmWhaleTradeAvailability
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime






T = TypeVar("T", bound="PublicPmWhaleTrade")



@_attrs_define
class PublicPmWhaleTrade:
    """ 
        Attributes:
            source (PublicPmSourceSlug):
            event_slug (str):
            side (str):
            outcome (str):
            usd_value (float):
            price (float):
            evidence_type (str):
            availability (PublicPmWhaleTradeAvailability):
            observed_at (datetime.datetime):
            source_name (str | Unset):
            event_title (str | Unset):
            evidence_ref (None | str | Unset):
            evidence_url (None | str | Unset):
            traded_at (datetime.datetime | None | Unset):
            latency_seconds (float | None | Unset):
     """

    source: PublicPmSourceSlug
    event_slug: str
    side: str
    outcome: str
    usd_value: float
    price: float
    evidence_type: str
    availability: PublicPmWhaleTradeAvailability
    observed_at: datetime.datetime
    source_name: str | Unset = UNSET
    event_title: str | Unset = UNSET
    evidence_ref: None | str | Unset = UNSET
    evidence_url: None | str | Unset = UNSET
    traded_at: datetime.datetime | None | Unset = UNSET
    latency_seconds: float | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        source = self.source.value

        event_slug = self.event_slug

        side = self.side

        outcome = self.outcome

        usd_value = self.usd_value

        price = self.price

        evidence_type = self.evidence_type

        availability = self.availability.value

        observed_at = self.observed_at.isoformat()

        source_name = self.source_name

        event_title = self.event_title

        evidence_ref: None | str | Unset
        if isinstance(self.evidence_ref, Unset):
            evidence_ref = UNSET
        else:
            evidence_ref = self.evidence_ref

        evidence_url: None | str | Unset
        if isinstance(self.evidence_url, Unset):
            evidence_url = UNSET
        else:
            evidence_url = self.evidence_url

        traded_at: None | str | Unset
        if isinstance(self.traded_at, Unset):
            traded_at = UNSET
        elif isinstance(self.traded_at, datetime.datetime):
            traded_at = self.traded_at.isoformat()
        else:
            traded_at = self.traded_at

        latency_seconds: float | None | Unset
        if isinstance(self.latency_seconds, Unset):
            latency_seconds = UNSET
        else:
            latency_seconds = self.latency_seconds


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "source": source,
            "eventSlug": event_slug,
            "side": side,
            "outcome": outcome,
            "usdValue": usd_value,
            "price": price,
            "evidenceType": evidence_type,
            "availability": availability,
            "observedAt": observed_at,
        })
        if source_name is not UNSET:
            field_dict["sourceName"] = source_name
        if event_title is not UNSET:
            field_dict["eventTitle"] = event_title
        if evidence_ref is not UNSET:
            field_dict["evidenceRef"] = evidence_ref
        if evidence_url is not UNSET:
            field_dict["evidenceUrl"] = evidence_url
        if traded_at is not UNSET:
            field_dict["tradedAt"] = traded_at
        if latency_seconds is not UNSET:
            field_dict["latencySeconds"] = latency_seconds

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        source = PublicPmSourceSlug(d.pop("source"))




        event_slug = d.pop("eventSlug")

        side = d.pop("side")

        outcome = d.pop("outcome")

        usd_value = d.pop("usdValue")

        price = d.pop("price")

        evidence_type = d.pop("evidenceType")

        availability = PublicPmWhaleTradeAvailability(d.pop("availability"))




        observed_at = isoparse(d.pop("observedAt"))




        source_name = d.pop("sourceName", UNSET)

        event_title = d.pop("eventTitle", UNSET)

        def _parse_evidence_ref(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        evidence_ref = _parse_evidence_ref(d.pop("evidenceRef", UNSET))


        def _parse_evidence_url(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        evidence_url = _parse_evidence_url(d.pop("evidenceUrl", UNSET))


        def _parse_traded_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                traded_at_type_0 = isoparse(data)



                return traded_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        traded_at = _parse_traded_at(d.pop("tradedAt", UNSET))


        def _parse_latency_seconds(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        latency_seconds = _parse_latency_seconds(d.pop("latencySeconds", UNSET))


        public_pm_whale_trade = cls(
            source=source,
            event_slug=event_slug,
            side=side,
            outcome=outcome,
            usd_value=usd_value,
            price=price,
            evidence_type=evidence_type,
            availability=availability,
            observed_at=observed_at,
            source_name=source_name,
            event_title=event_title,
            evidence_ref=evidence_ref,
            evidence_url=evidence_url,
            traded_at=traded_at,
            latency_seconds=latency_seconds,
        )


        public_pm_whale_trade.additional_properties = d
        return public_pm_whale_trade

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
