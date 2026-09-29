from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.get_public_prediction_market_price_history_response_200_outcome_type_0 import (
        GetPublicPredictionMarketPriceHistoryResponse200OutcomeType0,
    )
    from ..models.get_public_prediction_market_price_history_response_200_points_item import (
        GetPublicPredictionMarketPriceHistoryResponse200PointsItem,
    )


T = TypeVar("T", bound="GetPublicPredictionMarketPriceHistoryResponse200")


@_attrs_define
class GetPublicPredictionMarketPriceHistoryResponse200:
    """
    Attributes:
        source (str):
        slug (str):
        interval (str): The range served, in canonical form (1h, 6h, 1d, 1w, 1m or max).
        points (list[GetPublicPredictionMarketPriceHistoryResponse200PointsItem]):
        outcome (GetPublicPredictionMarketPriceHistoryResponse200OutcomeType0 | None | Unset): The outcome this series
            describes; null when the event has no outcomes.
    """

    source: str
    slug: str
    interval: str
    points: list[GetPublicPredictionMarketPriceHistoryResponse200PointsItem]
    outcome: GetPublicPredictionMarketPriceHistoryResponse200OutcomeType0 | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.get_public_prediction_market_price_history_response_200_outcome_type_0 import (
            GetPublicPredictionMarketPriceHistoryResponse200OutcomeType0,
        )

        source = self.source

        slug = self.slug

        interval = self.interval

        points = []
        for points_item_data in self.points:
            points_item = points_item_data.to_dict()
            points.append(points_item)

        outcome: dict[str, Any] | None | Unset
        if isinstance(self.outcome, Unset):
            outcome = UNSET
        elif isinstance(self.outcome, GetPublicPredictionMarketPriceHistoryResponse200OutcomeType0):
            outcome = self.outcome.to_dict()
        else:
            outcome = self.outcome

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "source": source,
                "slug": slug,
                "interval": interval,
                "points": points,
            }
        )
        if outcome is not UNSET:
            field_dict["outcome"] = outcome

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_public_prediction_market_price_history_response_200_outcome_type_0 import (
            GetPublicPredictionMarketPriceHistoryResponse200OutcomeType0,
        )
        from ..models.get_public_prediction_market_price_history_response_200_points_item import (
            GetPublicPredictionMarketPriceHistoryResponse200PointsItem,
        )

        d = dict(src_dict)
        source = d.pop("source")

        slug = d.pop("slug")

        interval = d.pop("interval")

        points = []
        _points = d.pop("points")
        for points_item_data in _points:
            points_item = GetPublicPredictionMarketPriceHistoryResponse200PointsItem.from_dict(points_item_data)

            points.append(points_item)

        def _parse_outcome(data: object) -> GetPublicPredictionMarketPriceHistoryResponse200OutcomeType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                outcome_type_0 = GetPublicPredictionMarketPriceHistoryResponse200OutcomeType0.from_dict(data)

                return outcome_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(GetPublicPredictionMarketPriceHistoryResponse200OutcomeType0 | None | Unset, data)

        outcome = _parse_outcome(d.pop("outcome", UNSET))

        get_public_prediction_market_price_history_response_200 = cls(
            source=source,
            slug=slug,
            interval=interval,
            points=points,
            outcome=outcome,
        )

        get_public_prediction_market_price_history_response_200.additional_properties = d
        return get_public_prediction_market_price_history_response_200

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
