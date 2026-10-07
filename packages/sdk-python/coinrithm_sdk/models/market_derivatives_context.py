from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.market_depth_context import MarketDepthContext
    from ..models.market_liquidation_context import MarketLiquidationContext
    from ..models.market_open_interest_context import MarketOpenInterestContext
    from ..models.market_positioning_context import MarketPositioningContext


T = TypeVar("T", bound="MarketDerivativesContext")


@_attrs_define
class MarketDerivativesContext:
    """Optional on older APIs. Members are additive and may be absent on older APIs; each can independently be null when
    unavailable or unusable.

        Attributes:
            open_interest (MarketOpenInterestContext | None | Unset):
            positioning (MarketPositioningContext | None | Unset):
            liquidations (MarketLiquidationContext | None | Unset):
            depth (MarketDepthContext | None | Unset):
    """

    open_interest: MarketOpenInterestContext | None | Unset = UNSET
    positioning: MarketPositioningContext | None | Unset = UNSET
    liquidations: MarketLiquidationContext | None | Unset = UNSET
    depth: MarketDepthContext | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.market_depth_context import MarketDepthContext
        from ..models.market_liquidation_context import MarketLiquidationContext
        from ..models.market_open_interest_context import MarketOpenInterestContext
        from ..models.market_positioning_context import MarketPositioningContext

        open_interest: dict[str, Any] | None | Unset
        if isinstance(self.open_interest, Unset):
            open_interest = UNSET
        elif isinstance(self.open_interest, MarketOpenInterestContext):
            open_interest = self.open_interest.to_dict()
        else:
            open_interest = self.open_interest

        positioning: dict[str, Any] | None | Unset
        if isinstance(self.positioning, Unset):
            positioning = UNSET
        elif isinstance(self.positioning, MarketPositioningContext):
            positioning = self.positioning.to_dict()
        else:
            positioning = self.positioning

        liquidations: dict[str, Any] | None | Unset
        if isinstance(self.liquidations, Unset):
            liquidations = UNSET
        elif isinstance(self.liquidations, MarketLiquidationContext):
            liquidations = self.liquidations.to_dict()
        else:
            liquidations = self.liquidations

        depth: dict[str, Any] | None | Unset
        if isinstance(self.depth, Unset):
            depth = UNSET
        elif isinstance(self.depth, MarketDepthContext):
            depth = self.depth.to_dict()
        else:
            depth = self.depth

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if open_interest is not UNSET:
            field_dict["openInterest"] = open_interest
        if positioning is not UNSET:
            field_dict["positioning"] = positioning
        if liquidations is not UNSET:
            field_dict["liquidations"] = liquidations
        if depth is not UNSET:
            field_dict["depth"] = depth

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.market_depth_context import MarketDepthContext
        from ..models.market_liquidation_context import MarketLiquidationContext
        from ..models.market_open_interest_context import MarketOpenInterestContext
        from ..models.market_positioning_context import MarketPositioningContext

        d = dict(src_dict)

        def _parse_open_interest(data: object) -> MarketOpenInterestContext | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                open_interest_type_0 = MarketOpenInterestContext.from_dict(data)

                return open_interest_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(MarketOpenInterestContext | None | Unset, data)

        open_interest = _parse_open_interest(d.pop("openInterest", UNSET))

        def _parse_positioning(data: object) -> MarketPositioningContext | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                positioning_type_0 = MarketPositioningContext.from_dict(data)

                return positioning_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(MarketPositioningContext | None | Unset, data)

        positioning = _parse_positioning(d.pop("positioning", UNSET))

        def _parse_liquidations(data: object) -> MarketLiquidationContext | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                liquidations_type_0 = MarketLiquidationContext.from_dict(data)

                return liquidations_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(MarketLiquidationContext | None | Unset, data)

        liquidations = _parse_liquidations(d.pop("liquidations", UNSET))

        def _parse_depth(data: object) -> MarketDepthContext | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                depth_type_0 = MarketDepthContext.from_dict(data)

                return depth_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(MarketDepthContext | None | Unset, data)

        depth = _parse_depth(d.pop("depth", UNSET))

        market_derivatives_context = cls(
            open_interest=open_interest,
            positioning=positioning,
            liquidations=liquidations,
            depth=depth,
        )

        market_derivatives_context.additional_properties = d
        return market_derivatives_context

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
