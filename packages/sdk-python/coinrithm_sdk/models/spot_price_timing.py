from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.spot_price_timing_coverage import SpotPriceTimingCoverage

T = TypeVar("T", bound="SpotPriceTiming")


@_attrs_define
class SpotPriceTiming:
    """Source-vs-row timing of the spot price (optional: absent on older API
    versions). Informational only: `freshness`, `eligible` and the write
    path's mark guard still measure the row WRITE time and are unchanged.
    `sourceObservedAt` is a venue snapshot/ticker time, NOT a last-trade
    time and NOT a per-fill receipt.

        Attributes:
            row_written_at (datetime.datetime | None): When CoinRithm wrote the price row; the same instant as
                freshness.asOf. null when there is no row.
            source_observed_at (datetime.datetime | None): The OLDEST venue snapshot time among the winning price cluster's
                members that carry one. null when no member carries one.
            source_age_seconds (float | None): max(0, now - sourceObservedAt), the same clamp as freshness.ageSeconds.
            write_lag_seconds (float | None): rowWrittenAt - sourceObservedAt in seconds, SIGNED. Negative means
                the venue's clock ran ahead of CoinRithm's (the writer admits up to
                5 minutes); it is never clamped.
            coverage (SpotPriceTimingCoverage): recorded: at least one cluster member carried a source time. It may
                be PARTIAL: members without a stamp (e.g. Kraken, Gate.io) are not
                represented. not_recorded: the row has no source time (unknown,
                never fresh). no_row: there is no price row.
            basis (Literal['venue_snapshot_time']):
    """

    row_written_at: datetime.datetime | None
    source_observed_at: datetime.datetime | None
    source_age_seconds: float | None
    write_lag_seconds: float | None
    coverage: SpotPriceTimingCoverage
    basis: Literal["venue_snapshot_time"]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        row_written_at: None | str
        if isinstance(self.row_written_at, datetime.datetime):
            row_written_at = self.row_written_at.isoformat()
        else:
            row_written_at = self.row_written_at

        source_observed_at: None | str
        if isinstance(self.source_observed_at, datetime.datetime):
            source_observed_at = self.source_observed_at.isoformat()
        else:
            source_observed_at = self.source_observed_at

        source_age_seconds: float | None
        source_age_seconds = self.source_age_seconds

        write_lag_seconds: float | None
        write_lag_seconds = self.write_lag_seconds

        coverage = self.coverage.value

        basis = self.basis

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "rowWrittenAt": row_written_at,
                "sourceObservedAt": source_observed_at,
                "sourceAgeSeconds": source_age_seconds,
                "writeLagSeconds": write_lag_seconds,
                "coverage": coverage,
                "basis": basis,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_row_written_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                row_written_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return row_written_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        row_written_at = _parse_row_written_at(d.pop("rowWrittenAt"))

        def _parse_source_observed_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                source_observed_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return source_observed_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        source_observed_at = _parse_source_observed_at(d.pop("sourceObservedAt"))

        def _parse_source_age_seconds(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        source_age_seconds = _parse_source_age_seconds(d.pop("sourceAgeSeconds"))

        def _parse_write_lag_seconds(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        write_lag_seconds = _parse_write_lag_seconds(d.pop("writeLagSeconds"))

        coverage = SpotPriceTimingCoverage(d.pop("coverage"))

        basis = cast(Literal["venue_snapshot_time"], d.pop("basis"))
        if basis != "venue_snapshot_time":
            raise ValueError(f"basis must match const 'venue_snapshot_time', got '{basis}'")

        spot_price_timing = cls(
            row_written_at=row_written_at,
            source_observed_at=source_observed_at,
            source_age_seconds=source_age_seconds,
            write_lag_seconds=write_lag_seconds,
            coverage=coverage,
            basis=basis,
        )

        spot_price_timing.additional_properties = d
        return spot_price_timing

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
