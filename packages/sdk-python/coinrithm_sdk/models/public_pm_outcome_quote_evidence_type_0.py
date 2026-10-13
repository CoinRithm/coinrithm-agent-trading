from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmOutcomeQuoteEvidenceType0")


@_attrs_define
class PublicPmOutcomeQuoteEvidenceType0:
    """Present only when the request sent `includeQuoteEvidence=1`. The
    stored venue book observation for Polymarket and Kalshi outcomes on
    a 0-100 scale (values outside 0-100 are served as null); null for
    other venues or when none is stored. Not an executable quote.

        Attributes:
            version (int | Unset):
            bid (float | None | Unset):
            ask (float | None | Unset):
            last (float | None | Unset):
    """

    version: int | Unset = UNSET
    bid: float | None | Unset = UNSET
    ask: float | None | Unset = UNSET
    last: float | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        version = self.version

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

        last: float | None | Unset
        if isinstance(self.last, Unset):
            last = UNSET
        else:
            last = self.last

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if version is not UNSET:
            field_dict["version"] = version
        if bid is not UNSET:
            field_dict["bid"] = bid
        if ask is not UNSET:
            field_dict["ask"] = ask
        if last is not UNSET:
            field_dict["last"] = last

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        version = d.pop("version", UNSET)

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

        def _parse_last(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        last = _parse_last(d.pop("last", UNSET))

        public_pm_outcome_quote_evidence_type_0 = cls(
            version=version,
            bid=bid,
            ask=ask,
            last=last,
        )

        public_pm_outcome_quote_evidence_type_0.additional_properties = d
        return public_pm_outcome_quote_evidence_type_0

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
