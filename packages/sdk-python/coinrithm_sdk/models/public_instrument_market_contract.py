from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_instrument_market_contract_comparator import PublicInstrumentMarketContractComparator
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_instrument_market_contract_parse import PublicInstrumentMarketContractParse


T = TypeVar("T", bound="PublicInstrumentMarketContract")


@_attrs_define
class PublicInstrumentMarketContract:
    """
    Attributes:
        label (str): Display text; venue strike values are kept as given (81999.99 = $82,000 or above).
        comparator (PublicInstrumentMarketContractComparator):
        unit (str):
        traded_recently (bool): False: show as no recent trading, never as a live price.
        outcome_id (int | str | Unset):
        external_market_id (None | str | Unset):
        strike_low (float | None | Unset):
        strike_high (float | None | Unset):
        probability (float | None | Unset):
        bid (float | None | Unset):
        ask (float | None | Unset):
        contract_volume_24_h (float | None | Unset): Kalshi only: contracts ($1 notional each).
        contract_open_interest (float | None | Unset):
        equivalence_key (None | str | Unset):
        event_slug (None | str | Unset):
        parse (PublicInstrumentMarketContractParse | Unset):
    """

    label: str
    comparator: PublicInstrumentMarketContractComparator
    unit: str
    traded_recently: bool
    outcome_id: int | str | Unset = UNSET
    external_market_id: None | str | Unset = UNSET
    strike_low: float | None | Unset = UNSET
    strike_high: float | None | Unset = UNSET
    probability: float | None | Unset = UNSET
    bid: float | None | Unset = UNSET
    ask: float | None | Unset = UNSET
    contract_volume_24_h: float | None | Unset = UNSET
    contract_open_interest: float | None | Unset = UNSET
    equivalence_key: None | str | Unset = UNSET
    event_slug: None | str | Unset = UNSET
    parse: PublicInstrumentMarketContractParse | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        label = self.label

        comparator = self.comparator.value

        unit = self.unit

        traded_recently = self.traded_recently

        outcome_id: int | str | Unset
        if isinstance(self.outcome_id, Unset):
            outcome_id = UNSET
        else:
            outcome_id = self.outcome_id

        external_market_id: None | str | Unset
        if isinstance(self.external_market_id, Unset):
            external_market_id = UNSET
        else:
            external_market_id = self.external_market_id

        strike_low: float | None | Unset
        if isinstance(self.strike_low, Unset):
            strike_low = UNSET
        else:
            strike_low = self.strike_low

        strike_high: float | None | Unset
        if isinstance(self.strike_high, Unset):
            strike_high = UNSET
        else:
            strike_high = self.strike_high

        probability: float | None | Unset
        if isinstance(self.probability, Unset):
            probability = UNSET
        else:
            probability = self.probability

        bid: float | None | Unset
        if isinstance(self.bid, Unset):
            bid = UNSET
        else:
            bid = self.bid

        ask: float | None | Unset
        if isinstance(self.ask, Unset):
            ask = UNSET
        else:
            ask = self.ask

        contract_volume_24_h: float | None | Unset
        if isinstance(self.contract_volume_24_h, Unset):
            contract_volume_24_h = UNSET
        else:
            contract_volume_24_h = self.contract_volume_24_h

        contract_open_interest: float | None | Unset
        if isinstance(self.contract_open_interest, Unset):
            contract_open_interest = UNSET
        else:
            contract_open_interest = self.contract_open_interest

        equivalence_key: None | str | Unset
        if isinstance(self.equivalence_key, Unset):
            equivalence_key = UNSET
        else:
            equivalence_key = self.equivalence_key

        event_slug: None | str | Unset
        if isinstance(self.event_slug, Unset):
            event_slug = UNSET
        else:
            event_slug = self.event_slug

        parse: dict[str, Any] | Unset = UNSET
        if not isinstance(self.parse, Unset):
            parse = self.parse.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "label": label,
                "comparator": comparator,
                "unit": unit,
                "tradedRecently": traded_recently,
            }
        )
        if outcome_id is not UNSET:
            field_dict["outcomeId"] = outcome_id
        if external_market_id is not UNSET:
            field_dict["externalMarketId"] = external_market_id
        if strike_low is not UNSET:
            field_dict["strikeLow"] = strike_low
        if strike_high is not UNSET:
            field_dict["strikeHigh"] = strike_high
        if probability is not UNSET:
            field_dict["probability"] = probability
        if bid is not UNSET:
            field_dict["bid"] = bid
        if ask is not UNSET:
            field_dict["ask"] = ask
        if contract_volume_24_h is not UNSET:
            field_dict["contractVolume24h"] = contract_volume_24_h
        if contract_open_interest is not UNSET:
            field_dict["contractOpenInterest"] = contract_open_interest
        if equivalence_key is not UNSET:
            field_dict["equivalenceKey"] = equivalence_key
        if event_slug is not UNSET:
            field_dict["eventSlug"] = event_slug
        if parse is not UNSET:
            field_dict["parse"] = parse

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_instrument_market_contract_parse import PublicInstrumentMarketContractParse

        d = dict(src_dict)
        label = d.pop("label")

        comparator = PublicInstrumentMarketContractComparator(d.pop("comparator"))

        unit = d.pop("unit")

        traded_recently = d.pop("tradedRecently")

        def _parse_outcome_id(data: object) -> int | str | Unset:
            if isinstance(data, Unset):
                return data
            return cast(int | str | Unset, data)

        outcome_id = _parse_outcome_id(d.pop("outcomeId", UNSET))

        def _parse_external_market_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        external_market_id = _parse_external_market_id(d.pop("externalMarketId", UNSET))

        def _parse_strike_low(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        strike_low = _parse_strike_low(d.pop("strikeLow", UNSET))

        def _parse_strike_high(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        strike_high = _parse_strike_high(d.pop("strikeHigh", UNSET))

        def _parse_probability(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        probability = _parse_probability(d.pop("probability", UNSET))

        def _parse_bid(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        bid = _parse_bid(d.pop("bid", UNSET))

        def _parse_ask(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        ask = _parse_ask(d.pop("ask", UNSET))

        def _parse_contract_volume_24_h(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        contract_volume_24_h = _parse_contract_volume_24_h(d.pop("contractVolume24h", UNSET))

        def _parse_contract_open_interest(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        contract_open_interest = _parse_contract_open_interest(d.pop("contractOpenInterest", UNSET))

        def _parse_equivalence_key(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        equivalence_key = _parse_equivalence_key(d.pop("equivalenceKey", UNSET))

        def _parse_event_slug(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        event_slug = _parse_event_slug(d.pop("eventSlug", UNSET))

        _parse = d.pop("parse", UNSET)
        parse: PublicInstrumentMarketContractParse | Unset
        if isinstance(_parse, Unset):
            parse = UNSET
        else:
            parse = PublicInstrumentMarketContractParse.from_dict(_parse)

        public_instrument_market_contract = cls(
            label=label,
            comparator=comparator,
            unit=unit,
            traded_recently=traded_recently,
            outcome_id=outcome_id,
            external_market_id=external_market_id,
            strike_low=strike_low,
            strike_high=strike_high,
            probability=probability,
            bid=bid,
            ask=ask,
            contract_volume_24_h=contract_volume_24_h,
            contract_open_interest=contract_open_interest,
            equivalence_key=equivalence_key,
            event_slug=event_slug,
            parse=parse,
        )

        public_instrument_market_contract.additional_properties = d
        return public_instrument_market_contract

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
