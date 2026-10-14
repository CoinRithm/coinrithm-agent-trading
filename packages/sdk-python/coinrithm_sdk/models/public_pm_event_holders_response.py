from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_pm_event_holders_response_provider import PublicPmEventHoldersResponseProvider
from ..models.public_pm_event_holders_response_reason import PublicPmEventHoldersResponseReason
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_event_holders_response_outcomes_item import PublicPmEventHoldersResponseOutcomesItem


T = TypeVar("T", bound="PublicPmEventHoldersResponse")


@_attrs_define
class PublicPmEventHoldersResponse:
    """
    Attributes:
        source (str):
        slug (str):
        available (bool):
        reason (PublicPmEventHoldersResponseReason | Unset): Present only when `available` is false.
        provider (PublicPmEventHoldersResponseProvider | Unset):
        as_of (datetime.datetime | Unset):
        cache_ttl_seconds (int | Unset):
        holders_per_outcome (int | Unset):
        markets_covered (int | Unset):
        markets_total (int | Unset):
        outcomes (list[PublicPmEventHoldersResponseOutcomesItem] | Unset):
    """

    source: str
    slug: str
    available: bool
    reason: PublicPmEventHoldersResponseReason | Unset = UNSET
    provider: PublicPmEventHoldersResponseProvider | Unset = UNSET
    as_of: datetime.datetime | Unset = UNSET
    cache_ttl_seconds: int | Unset = UNSET
    holders_per_outcome: int | Unset = UNSET
    markets_covered: int | Unset = UNSET
    markets_total: int | Unset = UNSET
    outcomes: list[PublicPmEventHoldersResponseOutcomesItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        source = self.source

        slug = self.slug

        available = self.available

        reason: str | Unset = UNSET
        if not isinstance(self.reason, Unset):
            reason = self.reason.value

        provider: str | Unset = UNSET
        if not isinstance(self.provider, Unset):
            provider = self.provider.value

        as_of: str | Unset = UNSET
        if not isinstance(self.as_of, Unset):
            as_of = self.as_of.isoformat()

        cache_ttl_seconds = self.cache_ttl_seconds

        holders_per_outcome = self.holders_per_outcome

        markets_covered = self.markets_covered

        markets_total = self.markets_total

        outcomes: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.outcomes, Unset):
            outcomes = []
            for outcomes_item_data in self.outcomes:
                outcomes_item = outcomes_item_data.to_dict()
                outcomes.append(outcomes_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "source": source,
                "slug": slug,
                "available": available,
            }
        )
        if reason is not UNSET:
            field_dict["reason"] = reason
        if provider is not UNSET:
            field_dict["provider"] = provider
        if as_of is not UNSET:
            field_dict["asOf"] = as_of
        if cache_ttl_seconds is not UNSET:
            field_dict["cacheTtlSeconds"] = cache_ttl_seconds
        if holders_per_outcome is not UNSET:
            field_dict["holdersPerOutcome"] = holders_per_outcome
        if markets_covered is not UNSET:
            field_dict["marketsCovered"] = markets_covered
        if markets_total is not UNSET:
            field_dict["marketsTotal"] = markets_total
        if outcomes is not UNSET:
            field_dict["outcomes"] = outcomes

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_event_holders_response_outcomes_item import PublicPmEventHoldersResponseOutcomesItem

        d = dict(src_dict)
        source = d.pop("source")

        slug = d.pop("slug")

        available = d.pop("available")

        _reason = d.pop("reason", UNSET)
        reason: PublicPmEventHoldersResponseReason | Unset
        if isinstance(_reason, Unset):
            reason = UNSET
        else:
            reason = PublicPmEventHoldersResponseReason(_reason)

        _provider = d.pop("provider", UNSET)
        provider: PublicPmEventHoldersResponseProvider | Unset
        if isinstance(_provider, Unset):
            provider = UNSET
        else:
            provider = PublicPmEventHoldersResponseProvider(_provider)

        _as_of = d.pop("asOf", UNSET)
        as_of: datetime.datetime | Unset
        if isinstance(_as_of, Unset):
            as_of = UNSET
        else:
            as_of = datetime.datetime.fromisoformat(_as_of.replace("Z", "+00:00"))

        cache_ttl_seconds = d.pop("cacheTtlSeconds", UNSET)

        holders_per_outcome = d.pop("holdersPerOutcome", UNSET)

        markets_covered = d.pop("marketsCovered", UNSET)

        markets_total = d.pop("marketsTotal", UNSET)

        _outcomes = d.pop("outcomes", UNSET)
        outcomes: list[PublicPmEventHoldersResponseOutcomesItem] | Unset = UNSET
        if _outcomes is not UNSET:
            outcomes = []
            for outcomes_item_data in _outcomes:
                outcomes_item = PublicPmEventHoldersResponseOutcomesItem.from_dict(outcomes_item_data)

                outcomes.append(outcomes_item)

        public_pm_event_holders_response = cls(
            source=source,
            slug=slug,
            available=available,
            reason=reason,
            provider=provider,
            as_of=as_of,
            cache_ttl_seconds=cache_ttl_seconds,
            holders_per_outcome=holders_per_outcome,
            markets_covered=markets_covered,
            markets_total=markets_total,
            outcomes=outcomes,
        )

        public_pm_event_holders_response.additional_properties = d
        return public_pm_event_holders_response

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
