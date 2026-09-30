from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_discovery_outcome_rule_basis import PmDiscoveryOutcomeRuleBasis
from ..models.pm_discovery_outcome_rule_reason import PmDiscoveryOutcomeRuleReason
from ..models.pm_discovery_outcome_rule_status import PmDiscoveryOutcomeRuleStatus
from ..types import UNSET, Unset

T = TypeVar("T", bound="PmDiscoveryOutcomeRule")


@_attrs_define
class PmDiscoveryOutcomeRule:
    """This outcome's own settlement rule as the provider states it, bound by
    provider market id (Kalshi ticker = `externalMarketId`), never by title
    words. `unknown` when the market is not in the provider data, has no
    rule, or is listed twice with different text (never resolved
    silently).

        Attributes:
            status (PmDiscoveryOutcomeRuleStatus):
            basis (PmDiscoveryOutcomeRuleBasis):
            market_id (str):
            primary (str | Unset): exact only; cut with … when truncated
            secondary (None | str | Unset): exact only. null when the outcome has no secondary rule or it is
                the shared one in `resolution.rules` (`secondaryShared` true).
            secondary_shared (bool | Unset): exact only
            truncated (bool | Unset): exact only; primary or secondary was cut at 700 characters
            reason (PmDiscoveryOutcomeRuleReason | Unset): unknown only. `source_rules_unavailable`: the venue's per-market
                rules could not be read at all; `market_not_found`: they were read
                but do not include this market.
    """

    status: PmDiscoveryOutcomeRuleStatus
    basis: PmDiscoveryOutcomeRuleBasis
    market_id: str
    primary: str | Unset = UNSET
    secondary: None | str | Unset = UNSET
    secondary_shared: bool | Unset = UNSET
    truncated: bool | Unset = UNSET
    reason: PmDiscoveryOutcomeRuleReason | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        status = self.status.value

        basis = self.basis.value

        market_id = self.market_id

        primary = self.primary

        secondary: None | str | Unset
        if isinstance(self.secondary, Unset):
            secondary = UNSET
        else:
            secondary = self.secondary

        secondary_shared = self.secondary_shared

        truncated = self.truncated

        reason: str | Unset = UNSET
        if not isinstance(self.reason, Unset):
            reason = self.reason.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "status": status,
                "basis": basis,
                "marketId": market_id,
            }
        )
        if primary is not UNSET:
            field_dict["primary"] = primary
        if secondary is not UNSET:
            field_dict["secondary"] = secondary
        if secondary_shared is not UNSET:
            field_dict["secondaryShared"] = secondary_shared
        if truncated is not UNSET:
            field_dict["truncated"] = truncated
        if reason is not UNSET:
            field_dict["reason"] = reason

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        status = PmDiscoveryOutcomeRuleStatus(d.pop("status"))

        basis = PmDiscoveryOutcomeRuleBasis(d.pop("basis"))

        market_id = d.pop("marketId")

        primary = d.pop("primary", UNSET)

        def _parse_secondary(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        secondary = _parse_secondary(d.pop("secondary", UNSET))

        secondary_shared = d.pop("secondaryShared", UNSET)

        truncated = d.pop("truncated", UNSET)

        _reason = d.pop("reason", UNSET)
        reason: PmDiscoveryOutcomeRuleReason | Unset
        if isinstance(_reason, Unset):
            reason = UNSET
        else:
            reason = PmDiscoveryOutcomeRuleReason(_reason)

        pm_discovery_outcome_rule = cls(
            status=status,
            basis=basis,
            market_id=market_id,
            primary=primary,
            secondary=secondary,
            secondary_shared=secondary_shared,
            truncated=truncated,
            reason=reason,
        )

        pm_discovery_outcome_rule.additional_properties = d
        return pm_discovery_outcome_rule

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
