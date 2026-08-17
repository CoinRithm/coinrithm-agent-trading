from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmOutcome")


@_attrs_define
class PublicPmOutcome:
    """
    Attributes:
        name (str):
        external_market_id (str | Unset):
        probability (float | None | Unset): Provider-implied probability on a 0–100 scale (raw venue quote; may include
            vig, so a book's outcomes can sum above 100).
        normalized_probability (float | None | Unset): Vig-removed display probability on a 0–100 scale, proportionally
            normalized so a complete exclusive book sums to ~100. Null when the book is not a complete exclusive book
            (threshold ladders, partial catalogs, non-market sources). The raw `probability` remains the executable venue
            quote.
        price_change_24_h (float | None | Unset): 24h probability move in PERCENTAGE POINTS on the 0–100 scale (e.g. 5.5
            means +5.5 points), NOT a fraction and not a relative percent change.
    """

    name: str
    external_market_id: str | Unset = UNSET
    probability: float | None | Unset = UNSET
    normalized_probability: float | None | Unset = UNSET
    price_change_24_h: float | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        external_market_id = self.external_market_id

        probability: float | None | Unset
        if isinstance(self.probability, Unset):
            probability = UNSET
        else:
            probability = self.probability

        normalized_probability: float | None | Unset
        if isinstance(self.normalized_probability, Unset):
            normalized_probability = UNSET
        else:
            normalized_probability = self.normalized_probability

        price_change_24_h: float | None | Unset
        if isinstance(self.price_change_24_h, Unset):
            price_change_24_h = UNSET
        else:
            price_change_24_h = self.price_change_24_h

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
            }
        )
        if external_market_id is not UNSET:
            field_dict["externalMarketId"] = external_market_id
        if probability is not UNSET:
            field_dict["probability"] = probability
        if normalized_probability is not UNSET:
            field_dict["normalizedProbability"] = normalized_probability
        if price_change_24_h is not UNSET:
            field_dict["priceChange24h"] = price_change_24_h

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        external_market_id = d.pop("externalMarketId", UNSET)

        def _parse_probability(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        probability = _parse_probability(d.pop("probability", UNSET))

        def _parse_normalized_probability(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        normalized_probability = _parse_normalized_probability(d.pop("normalizedProbability", UNSET))

        def _parse_price_change_24_h(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        price_change_24_h = _parse_price_change_24_h(d.pop("priceChange24h", UNSET))

        public_pm_outcome = cls(
            name=name,
            external_market_id=external_market_id,
            probability=probability,
            normalized_probability=normalized_probability,
            price_change_24_h=price_change_24_h,
        )

        public_pm_outcome.additional_properties = d
        return public_pm_outcome

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
