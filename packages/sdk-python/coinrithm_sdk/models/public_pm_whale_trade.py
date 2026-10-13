from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_pm_source_slug import PublicPmSourceSlug
from ..models.public_pm_whale_trade_availability import PublicPmWhaleTradeAvailability
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_whale_trade_event import PublicPmWhaleTradeEvent


T = TypeVar("T", bound="PublicPmWhaleTrade")


@_attrs_define
class PublicPmWhaleTrade:
    """
    Attributes:
        source (PublicPmSourceSlug):
        event_slug (str):
        side (str):
        outcome (None | str): Outcome label; null when the venue row carries none.
        usd_value (float):
        price (float):
        evidence_type (str):
        availability (PublicPmWhaleTradeAvailability):
        observed_at (datetime.datetime):
        source_name (str | Unset):
        source_icon (None | str | Unset):
        event_title (str | Unset):
        wallet (str | Unset): Shortened display form of the wallet, not an identifier.
        wallet_address (None | str | Unset): Full lower-cased public address; null on venues that anonymize traders.
        trader_name (None | str | Unset):
        market_question (None | str | Unset): Nested market question on multi-market events; null on older rows.
        source_market_ref (None | str | Unset):
        native_value (float | None | Unset): Trade value in the venue's own currency, when it is not USD.
        native_currency (None | str | Unset):
        value_basis (None | str | Unset): How `usdValue` was derived from the venue value.
        evidence_ref (None | str | Unset):
        evidence_url (None | str | Unset):
        traded_at (datetime.datetime | None | Unset):
        latency_seconds (float | None | Unset):
        event (PublicPmWhaleTradeEvent | Unset): The event this trade belongs to. Sent on `/whales` and SSE `whale`
            rows, not on event detail.
    """

    source: PublicPmSourceSlug
    event_slug: str
    side: str
    outcome: None | str
    usd_value: float
    price: float
    evidence_type: str
    availability: PublicPmWhaleTradeAvailability
    observed_at: datetime.datetime
    source_name: str | Unset = UNSET
    source_icon: None | str | Unset = UNSET
    event_title: str | Unset = UNSET
    wallet: str | Unset = UNSET
    wallet_address: None | str | Unset = UNSET
    trader_name: None | str | Unset = UNSET
    market_question: None | str | Unset = UNSET
    source_market_ref: None | str | Unset = UNSET
    native_value: float | None | Unset = UNSET
    native_currency: None | str | Unset = UNSET
    value_basis: None | str | Unset = UNSET
    evidence_ref: None | str | Unset = UNSET
    evidence_url: None | str | Unset = UNSET
    traded_at: datetime.datetime | None | Unset = UNSET
    latency_seconds: float | None | Unset = UNSET
    event: PublicPmWhaleTradeEvent | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        source = self.source.value

        event_slug = self.event_slug

        side = self.side

        outcome: None | str
        outcome = self.outcome

        usd_value = self.usd_value

        price = self.price

        evidence_type = self.evidence_type

        availability = self.availability.value

        observed_at = self.observed_at.isoformat()

        source_name = self.source_name

        source_icon: None | str | Unset
        if isinstance(self.source_icon, Unset):
            source_icon = UNSET
        else:
            source_icon = self.source_icon

        event_title = self.event_title

        wallet = self.wallet

        wallet_address: None | str | Unset
        if isinstance(self.wallet_address, Unset):
            wallet_address = UNSET
        else:
            wallet_address = self.wallet_address

        trader_name: None | str | Unset
        if isinstance(self.trader_name, Unset):
            trader_name = UNSET
        else:
            trader_name = self.trader_name

        market_question: None | str | Unset
        if isinstance(self.market_question, Unset):
            market_question = UNSET
        else:
            market_question = self.market_question

        source_market_ref: None | str | Unset
        if isinstance(self.source_market_ref, Unset):
            source_market_ref = UNSET
        else:
            source_market_ref = self.source_market_ref

        native_value: float | None | Unset
        if isinstance(self.native_value, Unset):
            native_value = UNSET
        else:
            native_value = self.native_value

        native_currency: None | str | Unset
        if isinstance(self.native_currency, Unset):
            native_currency = UNSET
        else:
            native_currency = self.native_currency

        value_basis: None | str | Unset
        if isinstance(self.value_basis, Unset):
            value_basis = UNSET
        else:
            value_basis = self.value_basis

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

        event: dict[str, Any] | Unset = UNSET
        if not isinstance(self.event, Unset):
            event = self.event.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "source": source,
                "eventSlug": event_slug,
                "side": side,
                "outcome": outcome,
                "usdValue": usd_value,
                "price": price,
                "evidenceType": evidence_type,
                "availability": availability,
                "observedAt": observed_at,
            }
        )
        if source_name is not UNSET:
            field_dict["sourceName"] = source_name
        if source_icon is not UNSET:
            field_dict["sourceIcon"] = source_icon
        if event_title is not UNSET:
            field_dict["eventTitle"] = event_title
        if wallet is not UNSET:
            field_dict["wallet"] = wallet
        if wallet_address is not UNSET:
            field_dict["walletAddress"] = wallet_address
        if trader_name is not UNSET:
            field_dict["traderName"] = trader_name
        if market_question is not UNSET:
            field_dict["marketQuestion"] = market_question
        if source_market_ref is not UNSET:
            field_dict["sourceMarketRef"] = source_market_ref
        if native_value is not UNSET:
            field_dict["nativeValue"] = native_value
        if native_currency is not UNSET:
            field_dict["nativeCurrency"] = native_currency
        if value_basis is not UNSET:
            field_dict["valueBasis"] = value_basis
        if evidence_ref is not UNSET:
            field_dict["evidenceRef"] = evidence_ref
        if evidence_url is not UNSET:
            field_dict["evidenceUrl"] = evidence_url
        if traded_at is not UNSET:
            field_dict["tradedAt"] = traded_at
        if latency_seconds is not UNSET:
            field_dict["latencySeconds"] = latency_seconds
        if event is not UNSET:
            field_dict["event"] = event

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_whale_trade_event import PublicPmWhaleTradeEvent

        d = dict(src_dict)
        source = PublicPmSourceSlug(d.pop("source"))

        event_slug = d.pop("eventSlug")

        side = d.pop("side")

        def _parse_outcome(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        outcome = _parse_outcome(d.pop("outcome"))

        usd_value = d.pop("usdValue")

        price = d.pop("price")

        evidence_type = d.pop("evidenceType")

        availability = PublicPmWhaleTradeAvailability(d.pop("availability"))

        observed_at = datetime.datetime.fromisoformat(d.pop("observedAt").replace("Z", "+00:00"))

        source_name = d.pop("sourceName", UNSET)

        def _parse_source_icon(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        source_icon = _parse_source_icon(d.pop("sourceIcon", UNSET))

        event_title = d.pop("eventTitle", UNSET)

        wallet = d.pop("wallet", UNSET)

        def _parse_wallet_address(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        wallet_address = _parse_wallet_address(d.pop("walletAddress", UNSET))

        def _parse_trader_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        trader_name = _parse_trader_name(d.pop("traderName", UNSET))

        def _parse_market_question(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        market_question = _parse_market_question(d.pop("marketQuestion", UNSET))

        def _parse_source_market_ref(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        source_market_ref = _parse_source_market_ref(d.pop("sourceMarketRef", UNSET))

        def _parse_native_value(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        native_value = _parse_native_value(d.pop("nativeValue", UNSET))

        def _parse_native_currency(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        native_currency = _parse_native_currency(d.pop("nativeCurrency", UNSET))

        def _parse_value_basis(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        value_basis = _parse_value_basis(d.pop("valueBasis", UNSET))

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
                traded_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

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

        _event = d.pop("event", UNSET)
        event: PublicPmWhaleTradeEvent | Unset
        if isinstance(_event, Unset):
            event = UNSET
        else:
            event = PublicPmWhaleTradeEvent.from_dict(_event)

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
            source_icon=source_icon,
            event_title=event_title,
            wallet=wallet,
            wallet_address=wallet_address,
            trader_name=trader_name,
            market_question=market_question,
            source_market_ref=source_market_ref,
            native_value=native_value,
            native_currency=native_currency,
            value_basis=value_basis,
            evidence_ref=evidence_ref,
            evidence_url=evidence_url,
            traded_at=traded_at,
            latency_seconds=latency_seconds,
            event=event,
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
