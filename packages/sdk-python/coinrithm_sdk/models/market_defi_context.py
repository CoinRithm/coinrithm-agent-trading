from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.market_chain_tvl_context import MarketChainTvlContext
    from ..models.market_stablecoin_context import MarketStablecoinContext


T = TypeVar("T", bound="MarketDefiContext")


@_attrs_define
class MarketDefiContext:
    """Optional on older APIs; null when neither chain TVL nor market-wide stablecoin supply is usable. Each member can
    independently be null.

        Attributes:
            chain_tvl (MarketChainTvlContext | None):
            stablecoin_supply (MarketStablecoinContext | None):
    """

    chain_tvl: MarketChainTvlContext | None
    stablecoin_supply: MarketStablecoinContext | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.market_chain_tvl_context import MarketChainTvlContext
        from ..models.market_stablecoin_context import MarketStablecoinContext

        chain_tvl: dict[str, Any] | None
        if isinstance(self.chain_tvl, MarketChainTvlContext):
            chain_tvl = self.chain_tvl.to_dict()
        else:
            chain_tvl = self.chain_tvl

        stablecoin_supply: dict[str, Any] | None
        if isinstance(self.stablecoin_supply, MarketStablecoinContext):
            stablecoin_supply = self.stablecoin_supply.to_dict()
        else:
            stablecoin_supply = self.stablecoin_supply

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "chainTvl": chain_tvl,
                "stablecoinSupply": stablecoin_supply,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.market_chain_tvl_context import MarketChainTvlContext
        from ..models.market_stablecoin_context import MarketStablecoinContext

        d = dict(src_dict)

        def _parse_chain_tvl(data: object) -> MarketChainTvlContext | None:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                chain_tvl_type_0 = MarketChainTvlContext.from_dict(data)

                return chain_tvl_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(MarketChainTvlContext | None, data)

        chain_tvl = _parse_chain_tvl(d.pop("chainTvl"))

        def _parse_stablecoin_supply(data: object) -> MarketStablecoinContext | None:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                stablecoin_supply_type_0 = MarketStablecoinContext.from_dict(data)

                return stablecoin_supply_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(MarketStablecoinContext | None, data)

        stablecoin_supply = _parse_stablecoin_supply(d.pop("stablecoinSupply"))

        market_defi_context = cls(
            chain_tvl=chain_tvl,
            stablecoin_supply=stablecoin_supply,
        )

        market_defi_context.additional_properties = d
        return market_defi_context

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
