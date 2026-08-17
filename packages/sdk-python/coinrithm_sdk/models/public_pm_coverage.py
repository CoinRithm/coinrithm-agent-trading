from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_pm_coverage_completeness_class import PublicPmCoverageCompletenessClass
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_coverage_missing_field_rates_type_0 import PublicPmCoverageMissingFieldRatesType0


T = TypeVar("T", bound="PublicPmCoverage")


@_attrs_define
class PublicPmCoverage:
    """Gate-2 coverage ledger for one venue. Every nullable field means
    "not known", never zero — do not render a null as 0 or as evidence
    of absence.

        Attributes:
            computed_at (datetime.datetime | Unset):
            completeness_class (PublicPmCoverageCompletenessClass | Unset): What the LATEST catalog sweep observed. NOT a
                claim that the
                venue's lifetime universe is held — see universeVerified.
            universe_verified (bool | Unset): True only when coverage has been externally verified against a
                venue-published total. Currently false for every venue.
            universe_estimate (int | None | Unset): Upstream-reported total where the venue exposes one.
            open_universe_verified (bool | Unset): True when the OPEN set has been reconciled against a venue-supplied
                total. This is a weaker but REAL claim than `universeVerified`,
                which covers the lifetime universe and is false everywhere. Do not
                read a false here as "unverified coverage" — read it as "the venue
                publishes no total we can check the open set against".
            open_universe_provider_total (int | None | Unset): The venue-supplied count of open markets that
                `openUniverseEnumerated`
                was checked against. Null when the venue publishes no such total.
            open_universe_total_basis (None | str | Unset): How that total was obtained — `published_total` (the venue
                states a
                count) or `unpaginated_universe` (the venue returns its whole open
                set in one unpaginated response, so enumeration IS the total).
                Null when there is no total.
            open_universe_enumerated (int | None | Unset): Open markets CoinRithm enumerated in the latest sweep.
            enumerated_total (int | Unset):
            open_count (int | Unset):
            closed_count (int | Unset):
            resolved_provider_count (int | Unset):
            any_resolution_rate (float | None | Unset): Closed events with ANY recorded resolution / closed events.
            provider_resolution_rate (float | None | Unset): Closed events with a PROVIDER-verified resolution / closed
                events.
            freshness_p50_seconds (int | None | Unset):
            freshness_p95_seconds (int | None | Unset):
            freshness_p99_seconds (int | None | Unset):
            catalog_first_seen_day (datetime.date | None | Unset): When CoinRithm first saw this catalog. Not history depth.
            probability_history_start_day (datetime.date | None | Unset): How far stored probability history actually
                reaches. Null when no
                probability history is held for the venue.
            history_start_day (datetime.date | None | Unset): DEPRECATED alias of `catalogFirstSeenDay`, still served so
                existing
                consumers do not break. The original name read as history DEPTH
                when it only ever meant "when we first saw the catalog"; migrate to
                `catalogFirstSeenDay` for that fact, or to
                `probabilityHistoryStartDay` if depth is what you actually want.
            resolution_coverage_rate (float | None | Unset): DEPRECATED alias of `anyResolutionRate`, still served so
                existing
                consumers do not break. It was previously read as provider-verified
                coverage, which overstated it — use `anyResolutionRate` for any
                recorded resolution, or `providerResolutionRate` for the verified
                subset.
            missing_field_rates (None | PublicPmCoverageMissingFieldRatesType0 | Unset):
            approved_match_count (int | None | Unset):
            avg_match_confidence (float | None | Unset):
            last_full_reconciliation_at (datetime.datetime | None | Unset):
    """

    computed_at: datetime.datetime | Unset = UNSET
    completeness_class: PublicPmCoverageCompletenessClass | Unset = UNSET
    universe_verified: bool | Unset = UNSET
    universe_estimate: int | None | Unset = UNSET
    open_universe_verified: bool | Unset = UNSET
    open_universe_provider_total: int | None | Unset = UNSET
    open_universe_total_basis: None | str | Unset = UNSET
    open_universe_enumerated: int | None | Unset = UNSET
    enumerated_total: int | Unset = UNSET
    open_count: int | Unset = UNSET
    closed_count: int | Unset = UNSET
    resolved_provider_count: int | Unset = UNSET
    any_resolution_rate: float | None | Unset = UNSET
    provider_resolution_rate: float | None | Unset = UNSET
    freshness_p50_seconds: int | None | Unset = UNSET
    freshness_p95_seconds: int | None | Unset = UNSET
    freshness_p99_seconds: int | None | Unset = UNSET
    catalog_first_seen_day: datetime.date | None | Unset = UNSET
    probability_history_start_day: datetime.date | None | Unset = UNSET
    history_start_day: datetime.date | None | Unset = UNSET
    resolution_coverage_rate: float | None | Unset = UNSET
    missing_field_rates: None | PublicPmCoverageMissingFieldRatesType0 | Unset = UNSET
    approved_match_count: int | None | Unset = UNSET
    avg_match_confidence: float | None | Unset = UNSET
    last_full_reconciliation_at: datetime.datetime | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_pm_coverage_missing_field_rates_type_0 import PublicPmCoverageMissingFieldRatesType0

        computed_at: str | Unset = UNSET
        if not isinstance(self.computed_at, Unset):
            computed_at = self.computed_at.isoformat()

        completeness_class: str | Unset = UNSET
        if not isinstance(self.completeness_class, Unset):
            completeness_class = self.completeness_class.value

        universe_verified = self.universe_verified

        universe_estimate: int | None | Unset
        if isinstance(self.universe_estimate, Unset):
            universe_estimate = UNSET
        else:
            universe_estimate = self.universe_estimate

        open_universe_verified = self.open_universe_verified

        open_universe_provider_total: int | None | Unset
        if isinstance(self.open_universe_provider_total, Unset):
            open_universe_provider_total = UNSET
        else:
            open_universe_provider_total = self.open_universe_provider_total

        open_universe_total_basis: None | str | Unset
        if isinstance(self.open_universe_total_basis, Unset):
            open_universe_total_basis = UNSET
        else:
            open_universe_total_basis = self.open_universe_total_basis

        open_universe_enumerated: int | None | Unset
        if isinstance(self.open_universe_enumerated, Unset):
            open_universe_enumerated = UNSET
        else:
            open_universe_enumerated = self.open_universe_enumerated

        enumerated_total = self.enumerated_total

        open_count = self.open_count

        closed_count = self.closed_count

        resolved_provider_count = self.resolved_provider_count

        any_resolution_rate: float | None | Unset
        if isinstance(self.any_resolution_rate, Unset):
            any_resolution_rate = UNSET
        else:
            any_resolution_rate = self.any_resolution_rate

        provider_resolution_rate: float | None | Unset
        if isinstance(self.provider_resolution_rate, Unset):
            provider_resolution_rate = UNSET
        else:
            provider_resolution_rate = self.provider_resolution_rate

        freshness_p50_seconds: int | None | Unset
        if isinstance(self.freshness_p50_seconds, Unset):
            freshness_p50_seconds = UNSET
        else:
            freshness_p50_seconds = self.freshness_p50_seconds

        freshness_p95_seconds: int | None | Unset
        if isinstance(self.freshness_p95_seconds, Unset):
            freshness_p95_seconds = UNSET
        else:
            freshness_p95_seconds = self.freshness_p95_seconds

        freshness_p99_seconds: int | None | Unset
        if isinstance(self.freshness_p99_seconds, Unset):
            freshness_p99_seconds = UNSET
        else:
            freshness_p99_seconds = self.freshness_p99_seconds

        catalog_first_seen_day: None | str | Unset
        if isinstance(self.catalog_first_seen_day, Unset):
            catalog_first_seen_day = UNSET
        elif isinstance(self.catalog_first_seen_day, datetime.date):
            catalog_first_seen_day = self.catalog_first_seen_day.isoformat()
        else:
            catalog_first_seen_day = self.catalog_first_seen_day

        probability_history_start_day: None | str | Unset
        if isinstance(self.probability_history_start_day, Unset):
            probability_history_start_day = UNSET
        elif isinstance(self.probability_history_start_day, datetime.date):
            probability_history_start_day = self.probability_history_start_day.isoformat()
        else:
            probability_history_start_day = self.probability_history_start_day

        history_start_day: None | str | Unset
        if isinstance(self.history_start_day, Unset):
            history_start_day = UNSET
        elif isinstance(self.history_start_day, datetime.date):
            history_start_day = self.history_start_day.isoformat()
        else:
            history_start_day = self.history_start_day

        resolution_coverage_rate: float | None | Unset
        if isinstance(self.resolution_coverage_rate, Unset):
            resolution_coverage_rate = UNSET
        else:
            resolution_coverage_rate = self.resolution_coverage_rate

        missing_field_rates: dict[str, Any] | None | Unset
        if isinstance(self.missing_field_rates, Unset):
            missing_field_rates = UNSET
        elif isinstance(self.missing_field_rates, PublicPmCoverageMissingFieldRatesType0):
            missing_field_rates = self.missing_field_rates.to_dict()
        else:
            missing_field_rates = self.missing_field_rates

        approved_match_count: int | None | Unset
        if isinstance(self.approved_match_count, Unset):
            approved_match_count = UNSET
        else:
            approved_match_count = self.approved_match_count

        avg_match_confidence: float | None | Unset
        if isinstance(self.avg_match_confidence, Unset):
            avg_match_confidence = UNSET
        else:
            avg_match_confidence = self.avg_match_confidence

        last_full_reconciliation_at: None | str | Unset
        if isinstance(self.last_full_reconciliation_at, Unset):
            last_full_reconciliation_at = UNSET
        elif isinstance(self.last_full_reconciliation_at, datetime.datetime):
            last_full_reconciliation_at = self.last_full_reconciliation_at.isoformat()
        else:
            last_full_reconciliation_at = self.last_full_reconciliation_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if computed_at is not UNSET:
            field_dict["computedAt"] = computed_at
        if completeness_class is not UNSET:
            field_dict["completenessClass"] = completeness_class
        if universe_verified is not UNSET:
            field_dict["universeVerified"] = universe_verified
        if universe_estimate is not UNSET:
            field_dict["universeEstimate"] = universe_estimate
        if open_universe_verified is not UNSET:
            field_dict["openUniverseVerified"] = open_universe_verified
        if open_universe_provider_total is not UNSET:
            field_dict["openUniverseProviderTotal"] = open_universe_provider_total
        if open_universe_total_basis is not UNSET:
            field_dict["openUniverseTotalBasis"] = open_universe_total_basis
        if open_universe_enumerated is not UNSET:
            field_dict["openUniverseEnumerated"] = open_universe_enumerated
        if enumerated_total is not UNSET:
            field_dict["enumeratedTotal"] = enumerated_total
        if open_count is not UNSET:
            field_dict["openCount"] = open_count
        if closed_count is not UNSET:
            field_dict["closedCount"] = closed_count
        if resolved_provider_count is not UNSET:
            field_dict["resolvedProviderCount"] = resolved_provider_count
        if any_resolution_rate is not UNSET:
            field_dict["anyResolutionRate"] = any_resolution_rate
        if provider_resolution_rate is not UNSET:
            field_dict["providerResolutionRate"] = provider_resolution_rate
        if freshness_p50_seconds is not UNSET:
            field_dict["freshnessP50Seconds"] = freshness_p50_seconds
        if freshness_p95_seconds is not UNSET:
            field_dict["freshnessP95Seconds"] = freshness_p95_seconds
        if freshness_p99_seconds is not UNSET:
            field_dict["freshnessP99Seconds"] = freshness_p99_seconds
        if catalog_first_seen_day is not UNSET:
            field_dict["catalogFirstSeenDay"] = catalog_first_seen_day
        if probability_history_start_day is not UNSET:
            field_dict["probabilityHistoryStartDay"] = probability_history_start_day
        if history_start_day is not UNSET:
            field_dict["historyStartDay"] = history_start_day
        if resolution_coverage_rate is not UNSET:
            field_dict["resolutionCoverageRate"] = resolution_coverage_rate
        if missing_field_rates is not UNSET:
            field_dict["missingFieldRates"] = missing_field_rates
        if approved_match_count is not UNSET:
            field_dict["approvedMatchCount"] = approved_match_count
        if avg_match_confidence is not UNSET:
            field_dict["avgMatchConfidence"] = avg_match_confidence
        if last_full_reconciliation_at is not UNSET:
            field_dict["lastFullReconciliationAt"] = last_full_reconciliation_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_coverage_missing_field_rates_type_0 import PublicPmCoverageMissingFieldRatesType0

        d = dict(src_dict)
        _computed_at = d.pop("computedAt", UNSET)
        computed_at: datetime.datetime | Unset
        if isinstance(_computed_at, Unset):
            computed_at = UNSET
        else:
            computed_at = datetime.datetime.fromisoformat(_computed_at)

        _completeness_class = d.pop("completenessClass", UNSET)
        completeness_class: PublicPmCoverageCompletenessClass | Unset
        if isinstance(_completeness_class, Unset):
            completeness_class = UNSET
        else:
            completeness_class = PublicPmCoverageCompletenessClass(_completeness_class)

        universe_verified = d.pop("universeVerified", UNSET)

        def _parse_universe_estimate(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        universe_estimate = _parse_universe_estimate(d.pop("universeEstimate", UNSET))

        open_universe_verified = d.pop("openUniverseVerified", UNSET)

        def _parse_open_universe_provider_total(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        open_universe_provider_total = _parse_open_universe_provider_total(d.pop("openUniverseProviderTotal", UNSET))

        def _parse_open_universe_total_basis(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        open_universe_total_basis = _parse_open_universe_total_basis(d.pop("openUniverseTotalBasis", UNSET))

        def _parse_open_universe_enumerated(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        open_universe_enumerated = _parse_open_universe_enumerated(d.pop("openUniverseEnumerated", UNSET))

        enumerated_total = d.pop("enumeratedTotal", UNSET)

        open_count = d.pop("openCount", UNSET)

        closed_count = d.pop("closedCount", UNSET)

        resolved_provider_count = d.pop("resolvedProviderCount", UNSET)

        def _parse_any_resolution_rate(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        any_resolution_rate = _parse_any_resolution_rate(d.pop("anyResolutionRate", UNSET))

        def _parse_provider_resolution_rate(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        provider_resolution_rate = _parse_provider_resolution_rate(d.pop("providerResolutionRate", UNSET))

        def _parse_freshness_p50_seconds(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        freshness_p50_seconds = _parse_freshness_p50_seconds(d.pop("freshnessP50Seconds", UNSET))

        def _parse_freshness_p95_seconds(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        freshness_p95_seconds = _parse_freshness_p95_seconds(d.pop("freshnessP95Seconds", UNSET))

        def _parse_freshness_p99_seconds(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        freshness_p99_seconds = _parse_freshness_p99_seconds(d.pop("freshnessP99Seconds", UNSET))

        def _parse_catalog_first_seen_day(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                catalog_first_seen_day_type_0 = datetime.date.fromisoformat(data)

                return catalog_first_seen_day_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        catalog_first_seen_day = _parse_catalog_first_seen_day(d.pop("catalogFirstSeenDay", UNSET))

        def _parse_probability_history_start_day(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                probability_history_start_day_type_0 = datetime.date.fromisoformat(data)

                return probability_history_start_day_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        probability_history_start_day = _parse_probability_history_start_day(d.pop("probabilityHistoryStartDay", UNSET))

        def _parse_history_start_day(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                history_start_day_type_0 = datetime.date.fromisoformat(data)

                return history_start_day_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        history_start_day = _parse_history_start_day(d.pop("historyStartDay", UNSET))

        def _parse_resolution_coverage_rate(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        resolution_coverage_rate = _parse_resolution_coverage_rate(d.pop("resolutionCoverageRate", UNSET))

        def _parse_missing_field_rates(data: object) -> None | PublicPmCoverageMissingFieldRatesType0 | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                missing_field_rates_type_0 = PublicPmCoverageMissingFieldRatesType0.from_dict(data)

                return missing_field_rates_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicPmCoverageMissingFieldRatesType0 | Unset, data)

        missing_field_rates = _parse_missing_field_rates(d.pop("missingFieldRates", UNSET))

        def _parse_approved_match_count(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        approved_match_count = _parse_approved_match_count(d.pop("approvedMatchCount", UNSET))

        def _parse_avg_match_confidence(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        avg_match_confidence = _parse_avg_match_confidence(d.pop("avgMatchConfidence", UNSET))

        def _parse_last_full_reconciliation_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                last_full_reconciliation_at_type_0 = datetime.datetime.fromisoformat(data)

                return last_full_reconciliation_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        last_full_reconciliation_at = _parse_last_full_reconciliation_at(d.pop("lastFullReconciliationAt", UNSET))

        public_pm_coverage = cls(
            computed_at=computed_at,
            completeness_class=completeness_class,
            universe_verified=universe_verified,
            universe_estimate=universe_estimate,
            open_universe_verified=open_universe_verified,
            open_universe_provider_total=open_universe_provider_total,
            open_universe_total_basis=open_universe_total_basis,
            open_universe_enumerated=open_universe_enumerated,
            enumerated_total=enumerated_total,
            open_count=open_count,
            closed_count=closed_count,
            resolved_provider_count=resolved_provider_count,
            any_resolution_rate=any_resolution_rate,
            provider_resolution_rate=provider_resolution_rate,
            freshness_p50_seconds=freshness_p50_seconds,
            freshness_p95_seconds=freshness_p95_seconds,
            freshness_p99_seconds=freshness_p99_seconds,
            catalog_first_seen_day=catalog_first_seen_day,
            probability_history_start_day=probability_history_start_day,
            history_start_day=history_start_day,
            resolution_coverage_rate=resolution_coverage_rate,
            missing_field_rates=missing_field_rates,
            approved_match_count=approved_match_count,
            avg_match_confidence=avg_match_confidence,
            last_full_reconciliation_at=last_full_reconciliation_at,
        )

        public_pm_coverage.additional_properties = d
        return public_pm_coverage

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
