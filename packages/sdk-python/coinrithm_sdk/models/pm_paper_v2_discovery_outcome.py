from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_paper_v2_discovery_outcome_native_end_basis import PmPaperV2DiscoveryOutcomeNativeEndBasis
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.pm_discovery_outcome_rule import PmDiscoveryOutcomeRule
    from ..models.pm_paper_v2_native_market import PmPaperV2NativeMarket


T = TypeVar("T", bound="PmPaperV2DiscoveryOutcome")


@_attrs_define
class PmPaperV2DiscoveryOutcome:
    """
    Attributes:
        native_market (PmPaperV2NativeMarket):
        native_end_at (datetime.datetime | None): Stored venue scheduled end (UTC); null when absent or invalid.
        native_end_basis (PmPaperV2DiscoveryOutcomeNativeEndBasis):
        settlement_time_known (bool): A scheduled end is not an observed settlement time.
        external_market_id (str | Unset):
        name (str | Unset):
        probability (float | Unset): 0..100
        token_id (None | str | Unset):
        eligible (bool | None | Unset): Per-outcome openability (structural + 0<p<100 live yes fill). null
            when scalars are unavailable.
        rules (PmDiscoveryOutcomeRule | Unset): This outcome's own settlement rule as the provider states it, bound by
            provider market id (Kalshi ticker = `externalMarketId`), never by title
            words. `unknown` when the market is not in the provider data, has no
            rule, or is listed twice with different text (never resolved
            silently).
    """

    native_market: PmPaperV2NativeMarket
    native_end_at: datetime.datetime | None
    native_end_basis: PmPaperV2DiscoveryOutcomeNativeEndBasis
    settlement_time_known: bool
    external_market_id: str | Unset = UNSET
    name: str | Unset = UNSET
    probability: float | Unset = UNSET
    token_id: None | str | Unset = UNSET
    eligible: bool | None | Unset = UNSET
    rules: PmDiscoveryOutcomeRule | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        native_market = self.native_market.to_dict()

        native_end_at: None | str
        if isinstance(self.native_end_at, datetime.datetime):
            native_end_at = self.native_end_at.isoformat()
        else:
            native_end_at = self.native_end_at

        native_end_basis = self.native_end_basis.value

        settlement_time_known = self.settlement_time_known

        external_market_id = self.external_market_id

        name = self.name

        probability = self.probability

        token_id: None | str | Unset
        if isinstance(self.token_id, Unset):
            token_id = UNSET
        else:
            token_id = self.token_id

        eligible: bool | None | Unset
        if isinstance(self.eligible, Unset):
            eligible = UNSET
        else:
            eligible = self.eligible

        rules: dict[str, Any] | Unset = UNSET
        if not isinstance(self.rules, Unset):
            rules = self.rules.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "nativeMarket": native_market,
                "nativeEndAt": native_end_at,
                "nativeEndBasis": native_end_basis,
                "settlementTimeKnown": settlement_time_known,
            }
        )
        if external_market_id is not UNSET:
            field_dict["externalMarketId"] = external_market_id
        if name is not UNSET:
            field_dict["name"] = name
        if probability is not UNSET:
            field_dict["probability"] = probability
        if token_id is not UNSET:
            field_dict["tokenId"] = token_id
        if eligible is not UNSET:
            field_dict["eligible"] = eligible
        if rules is not UNSET:
            field_dict["rules"] = rules

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.pm_discovery_outcome_rule import PmDiscoveryOutcomeRule
        from ..models.pm_paper_v2_native_market import PmPaperV2NativeMarket

        d = dict(src_dict)
        native_market = PmPaperV2NativeMarket.from_dict(d.pop("nativeMarket"))

        def _parse_native_end_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                native_end_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return native_end_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        native_end_at = _parse_native_end_at(d.pop("nativeEndAt"))

        native_end_basis = PmPaperV2DiscoveryOutcomeNativeEndBasis(d.pop("nativeEndBasis"))

        settlement_time_known = d.pop("settlementTimeKnown")

        external_market_id = d.pop("externalMarketId", UNSET)

        name = d.pop("name", UNSET)

        probability = d.pop("probability", UNSET)

        def _parse_token_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        token_id = _parse_token_id(d.pop("tokenId", UNSET))

        def _parse_eligible(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        eligible = _parse_eligible(d.pop("eligible", UNSET))

        _rules = d.pop("rules", UNSET)
        rules: PmDiscoveryOutcomeRule | Unset
        if isinstance(_rules, Unset):
            rules = UNSET
        else:
            rules = PmDiscoveryOutcomeRule.from_dict(_rules)

        pm_paper_v2_discovery_outcome = cls(
            native_market=native_market,
            native_end_at=native_end_at,
            native_end_basis=native_end_basis,
            settlement_time_known=settlement_time_known,
            external_market_id=external_market_id,
            name=name,
            probability=probability,
            token_id=token_id,
            eligible=eligible,
            rules=rules,
        )

        pm_paper_v2_discovery_outcome.additional_properties = d
        return pm_paper_v2_discovery_outcome

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
