from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_pm_prices_history_response_freshness_reason import PublicPmPricesHistoryResponseFreshnessReason
from ..models.public_pm_prices_history_response_freshness_status import PublicPmPricesHistoryResponseFreshnessStatus

T = TypeVar("T", bound="PublicPmPricesHistoryResponseFreshness")


@_attrs_define
class PublicPmPricesHistoryResponseFreshness:
    """Present only when at least one series is stored, not live. Such a response is cached for at most 30 seconds.

    Attributes:
        status (PublicPmPricesHistoryResponseFreshnessStatus):
        reason (PublicPmPricesHistoryResponseFreshnessReason):
        stored_markets (list[str]): The markets served from stored snapshots.
    """

    status: PublicPmPricesHistoryResponseFreshnessStatus
    reason: PublicPmPricesHistoryResponseFreshnessReason
    stored_markets: list[str]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        status = self.status.value

        reason = self.reason.value

        stored_markets = self.stored_markets

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "status": status,
                "reason": reason,
                "storedMarkets": stored_markets,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        status = PublicPmPricesHistoryResponseFreshnessStatus(d.pop("status"))

        reason = PublicPmPricesHistoryResponseFreshnessReason(d.pop("reason"))

        stored_markets = cast(list[str], d.pop("storedMarkets"))

        public_pm_prices_history_response_freshness = cls(
            status=status,
            reason=reason,
            stored_markets=stored_markets,
        )

        public_pm_prices_history_response_freshness.additional_properties = d
        return public_pm_prices_history_response_freshness

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
