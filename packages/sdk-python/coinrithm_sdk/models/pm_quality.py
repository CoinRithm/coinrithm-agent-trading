from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime






T = TypeVar("T", bound="PmQuality")



@_attrs_define
class PmQuality:
    """ Persisted quality assessment from CoinRithm's truth engine — the
    aggregator's proven, versioned verdict for this event (one current
    state per event, updated when facts change). Markets with critical
    failures remain visible everywhere; `decisionEligible: false` means
    new paper opens are BLOCKED (pm/open returns 422 with these stored
    reasons) and alerts are suppressed. Omitted entirely when no
    assessment row exists yet (brand-new events) — never fabricated.

        Attributes:
            decision_eligible (bool | Unset): Fresh, structurally valid, metrics-supported, open/quoteable, and not source-
                degraded.
            warning_reasons (list[str] | Unset): Non-blocking flags (e.g. anomaly_flagged). Informational.
            block_reasons (list[str] | Unset): Stable decision-blocking codes (stale_freshness, quote_dead, dead_zero,
                unpriced, not_open, freshness_unknown).
            policy_version (str | Unset): Version of the quality policy that produced this verdict (e.g. pm-quality-2).
            assessed_at (datetime.datetime | None | Unset): Source-capture time backing the verdict (freshness SSOT), not a
                row-write timestamp.
     """

    decision_eligible: bool | Unset = UNSET
    warning_reasons: list[str] | Unset = UNSET
    block_reasons: list[str] | Unset = UNSET
    policy_version: str | Unset = UNSET
    assessed_at: datetime.datetime | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        decision_eligible = self.decision_eligible

        warning_reasons: list[str] | Unset = UNSET
        if not isinstance(self.warning_reasons, Unset):
            warning_reasons = self.warning_reasons



        block_reasons: list[str] | Unset = UNSET
        if not isinstance(self.block_reasons, Unset):
            block_reasons = self.block_reasons



        policy_version = self.policy_version

        assessed_at: None | str | Unset
        if isinstance(self.assessed_at, Unset):
            assessed_at = UNSET
        elif isinstance(self.assessed_at, datetime.datetime):
            assessed_at = self.assessed_at.isoformat()
        else:
            assessed_at = self.assessed_at


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if decision_eligible is not UNSET:
            field_dict["decisionEligible"] = decision_eligible
        if warning_reasons is not UNSET:
            field_dict["warningReasons"] = warning_reasons
        if block_reasons is not UNSET:
            field_dict["blockReasons"] = block_reasons
        if policy_version is not UNSET:
            field_dict["policyVersion"] = policy_version
        if assessed_at is not UNSET:
            field_dict["assessedAt"] = assessed_at

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        decision_eligible = d.pop("decisionEligible", UNSET)

        warning_reasons = cast(list[str], d.pop("warningReasons", UNSET))


        block_reasons = cast(list[str], d.pop("blockReasons", UNSET))


        policy_version = d.pop("policyVersion", UNSET)

        def _parse_assessed_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                assessed_at_type_0 = isoparse(data)



                return assessed_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        assessed_at = _parse_assessed_at(d.pop("assessedAt", UNSET))


        pm_quality = cls(
            decision_eligible=decision_eligible,
            warning_reasons=warning_reasons,
            block_reasons=block_reasons,
            policy_version=policy_version,
            assessed_at=assessed_at,
        )


        pm_quality.additional_properties = d
        return pm_quality

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
