from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.decision_support_liquidity_tier import DecisionSupportLiquidityTier
from ..models.decision_support_quality_tier import DecisionSupportQualityTier
from ..models.decision_support_spread_tier import DecisionSupportSpreadTier
from ..models.decision_support_volume_tier import DecisionSupportVolumeTier
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.decision_support_flags import DecisionSupportFlags





T = TypeVar("T", bound="DecisionSupport")



@_attrs_define
class DecisionSupport:
    """ Pre-computed market-quality grade for a prediction market (the same
    builder the web event/hub cards use): a quality score + tiered
    liquidity/volume/spread + risk flags. Lets an agent gauge tradability
    without running its own analysis. Returned by get_market_context's
    relatedMarkets and by pm/quote.

        Attributes:
            quality_score (float | Unset):
            quality_tier (DecisionSupportQualityTier | Unset):
            spread_tier (DecisionSupportSpreadTier | Unset):
            liquidity_tier (DecisionSupportLiquidityTier | Unset):
            volume_tier (DecisionSupportVolumeTier | Unset):
            flags (DecisionSupportFlags | Unset):
     """

    quality_score: float | Unset = UNSET
    quality_tier: DecisionSupportQualityTier | Unset = UNSET
    spread_tier: DecisionSupportSpreadTier | Unset = UNSET
    liquidity_tier: DecisionSupportLiquidityTier | Unset = UNSET
    volume_tier: DecisionSupportVolumeTier | Unset = UNSET
    flags: DecisionSupportFlags | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.decision_support_flags import DecisionSupportFlags
        quality_score = self.quality_score

        quality_tier: str | Unset = UNSET
        if not isinstance(self.quality_tier, Unset):
            quality_tier = self.quality_tier.value


        spread_tier: str | Unset = UNSET
        if not isinstance(self.spread_tier, Unset):
            spread_tier = self.spread_tier.value


        liquidity_tier: str | Unset = UNSET
        if not isinstance(self.liquidity_tier, Unset):
            liquidity_tier = self.liquidity_tier.value


        volume_tier: str | Unset = UNSET
        if not isinstance(self.volume_tier, Unset):
            volume_tier = self.volume_tier.value


        flags: dict[str, Any] | Unset = UNSET
        if not isinstance(self.flags, Unset):
            flags = self.flags.to_dict()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if quality_score is not UNSET:
            field_dict["qualityScore"] = quality_score
        if quality_tier is not UNSET:
            field_dict["qualityTier"] = quality_tier
        if spread_tier is not UNSET:
            field_dict["spreadTier"] = spread_tier
        if liquidity_tier is not UNSET:
            field_dict["liquidityTier"] = liquidity_tier
        if volume_tier is not UNSET:
            field_dict["volumeTier"] = volume_tier
        if flags is not UNSET:
            field_dict["flags"] = flags

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.decision_support_flags import DecisionSupportFlags
        d = dict(src_dict)
        quality_score = d.pop("qualityScore", UNSET)

        _quality_tier = d.pop("qualityTier", UNSET)
        quality_tier: DecisionSupportQualityTier | Unset
        if isinstance(_quality_tier,  Unset):
            quality_tier = UNSET
        else:
            quality_tier = DecisionSupportQualityTier(_quality_tier)




        _spread_tier = d.pop("spreadTier", UNSET)
        spread_tier: DecisionSupportSpreadTier | Unset
        if isinstance(_spread_tier,  Unset):
            spread_tier = UNSET
        else:
            spread_tier = DecisionSupportSpreadTier(_spread_tier)




        _liquidity_tier = d.pop("liquidityTier", UNSET)
        liquidity_tier: DecisionSupportLiquidityTier | Unset
        if isinstance(_liquidity_tier,  Unset):
            liquidity_tier = UNSET
        else:
            liquidity_tier = DecisionSupportLiquidityTier(_liquidity_tier)




        _volume_tier = d.pop("volumeTier", UNSET)
        volume_tier: DecisionSupportVolumeTier | Unset
        if isinstance(_volume_tier,  Unset):
            volume_tier = UNSET
        else:
            volume_tier = DecisionSupportVolumeTier(_volume_tier)




        _flags = d.pop("flags", UNSET)
        flags: DecisionSupportFlags | Unset
        if isinstance(_flags,  Unset):
            flags = UNSET
        else:
            flags = DecisionSupportFlags.from_dict(_flags)




        decision_support = cls(
            quality_score=quality_score,
            quality_tier=quality_tier,
            spread_tier=spread_tier,
            liquidity_tier=liquidity_tier,
            volume_tier=volume_tier,
            flags=flags,
        )


        decision_support.additional_properties = d
        return decision_support

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
