from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_order_book_ask_evidence import PublicPmOrderBookAskEvidence
    from ..models.public_pm_order_book_level import PublicPmOrderBookLevel


T = TypeVar("T", bound="PublicPmOrderBookType0")


@_attrs_define
class PublicPmOrderBookType0:
    """Null when the source has no book endpoint or none is currently resting — a valid empty shape, not an error.

    Attributes:
        bid (float | None):
        ask (float | None):
        spread (float | None):
        midpoint (float | None):
        bids (list[PublicPmOrderBookLevel]): Bid levels, best (highest price) first.
        asks (list[PublicPmOrderBookLevel]): Ask levels, best (lowest price) first.
        ask_evidence (PublicPmOrderBookAskEvidence | Unset): Present only for Polymarket books; Kalshi books omit it.
    """

    bid: float | None
    ask: float | None
    spread: float | None
    midpoint: float | None
    bids: list[PublicPmOrderBookLevel]
    asks: list[PublicPmOrderBookLevel]
    ask_evidence: PublicPmOrderBookAskEvidence | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        bid: float | None
        bid = self.bid

        ask: float | None
        ask = self.ask

        spread: float | None
        spread = self.spread

        midpoint: float | None
        midpoint = self.midpoint

        bids = []
        for bids_item_data in self.bids:
            bids_item = bids_item_data.to_dict()
            bids.append(bids_item)

        asks = []
        for asks_item_data in self.asks:
            asks_item = asks_item_data.to_dict()
            asks.append(asks_item)

        ask_evidence: dict[str, Any] | Unset = UNSET
        if not isinstance(self.ask_evidence, Unset):
            ask_evidence = self.ask_evidence.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "bid": bid,
                "ask": ask,
                "spread": spread,
                "midpoint": midpoint,
                "bids": bids,
                "asks": asks,
            }
        )
        if ask_evidence is not UNSET:
            field_dict["askEvidence"] = ask_evidence

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_order_book_ask_evidence import PublicPmOrderBookAskEvidence
        from ..models.public_pm_order_book_level import PublicPmOrderBookLevel

        d = dict(src_dict)

        def _parse_bid(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        bid = _parse_bid(d.pop("bid"))

        def _parse_ask(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        ask = _parse_ask(d.pop("ask"))

        def _parse_spread(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        spread = _parse_spread(d.pop("spread"))

        def _parse_midpoint(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        midpoint = _parse_midpoint(d.pop("midpoint"))

        bids = []
        _bids = d.pop("bids")
        for bids_item_data in _bids:
            bids_item = PublicPmOrderBookLevel.from_dict(bids_item_data)

            bids.append(bids_item)

        asks = []
        _asks = d.pop("asks")
        for asks_item_data in _asks:
            asks_item = PublicPmOrderBookLevel.from_dict(asks_item_data)

            asks.append(asks_item)

        _ask_evidence = d.pop("askEvidence", UNSET)
        ask_evidence: PublicPmOrderBookAskEvidence | Unset
        if isinstance(_ask_evidence, Unset):
            ask_evidence = UNSET
        else:
            ask_evidence = PublicPmOrderBookAskEvidence.from_dict(_ask_evidence)

        public_pm_order_book_type_0 = cls(
            bid=bid,
            ask=ask,
            spread=spread,
            midpoint=midpoint,
            bids=bids,
            asks=asks,
            ask_evidence=ask_evidence,
        )

        public_pm_order_book_type_0.additional_properties = d
        return public_pm_order_book_type_0

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
