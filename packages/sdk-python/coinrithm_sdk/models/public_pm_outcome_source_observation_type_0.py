from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..models.public_pm_outcome_source_observation_type_0_basis import PublicPmOutcomeSourceObservationType0Basis
from ..models.public_pm_outcome_source_observation_type_0_provider import PublicPmOutcomeSourceObservationType0Provider
from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmOutcomeSourceObservationType0")


@_attrs_define
class PublicPmOutcomeSourceObservationType0:
    """Optional bounded provenance for the stored outcome price. Null means the supported source marker was unavailable or
    explicitly null; it does not prove that the outcome has no price. Timestamps describe source evidence, not current
    freshness or executable liquidity.

        Attributes:
            version (int): Source-observation schema version; currently 1.
            basis (PublicPmOutcomeSourceObservationType0Basis):
            provider (PublicPmOutcomeSourceObservationType0Provider):
            observed_at (datetime.datetime | None | Unset):
            trade_date (datetime.date | None | Unset):
    """

    version: int
    basis: PublicPmOutcomeSourceObservationType0Basis
    provider: PublicPmOutcomeSourceObservationType0Provider
    observed_at: datetime.datetime | None | Unset = UNSET
    trade_date: datetime.date | None | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        version = self.version

        basis = self.basis.value

        provider = self.provider.value

        observed_at: None | str | Unset
        if isinstance(self.observed_at, Unset):
            observed_at = UNSET
        elif isinstance(self.observed_at, datetime.datetime):
            observed_at = self.observed_at.isoformat()
        else:
            observed_at = self.observed_at

        trade_date: None | str | Unset
        if isinstance(self.trade_date, Unset):
            trade_date = UNSET
        elif isinstance(self.trade_date, datetime.date):
            trade_date = self.trade_date.isoformat()
        else:
            trade_date = self.trade_date

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "version": version,
                "basis": basis,
                "provider": provider,
            }
        )
        if observed_at is not UNSET:
            field_dict["observedAt"] = observed_at
        if trade_date is not UNSET:
            field_dict["tradeDate"] = trade_date

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        version = d.pop("version")

        basis = PublicPmOutcomeSourceObservationType0Basis(d.pop("basis"))

        provider = PublicPmOutcomeSourceObservationType0Provider(d.pop("provider"))

        def _parse_observed_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                observed_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return observed_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        observed_at = _parse_observed_at(d.pop("observedAt", UNSET))

        def _parse_trade_date(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                trade_date_type_0 = datetime.date.fromisoformat(data)

                return trade_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        trade_date = _parse_trade_date(d.pop("tradeDate", UNSET))

        public_pm_outcome_source_observation_type_0 = cls(
            version=version,
            basis=basis,
            provider=provider,
            observed_at=observed_at,
            trade_date=trade_date,
        )

        return public_pm_outcome_source_observation_type_0
