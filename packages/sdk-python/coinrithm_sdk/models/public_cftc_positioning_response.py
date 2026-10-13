from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_cftc_positioning_response_coverage import PublicCftcPositioningResponseCoverage
from ..models.public_data_status import PublicDataStatus

if TYPE_CHECKING:
    from ..models.public_cftc_contract import PublicCftcContract
    from ..models.public_cftc_report import PublicCftcReport
    from ..models.public_cftc_source import PublicCftcSource
    from ..models.public_fresh_until_meta import PublicFreshUntilMeta


T = TypeVar("T", bound="PublicCftcPositioningResponse")


@_attrs_define
class PublicCftcPositioningResponse:
    """
    Attributes:
        ticker (str):
        coverage (PublicCftcPositioningResponseCoverage):
        status (PublicDataStatus): Freshness of an upstream dataset CoinRithm re-reads on a schedule.
            `stale` data is still served inside its documented maximum age;
            `unavailable` means no usable copy, never zero or empty truth.
        contract (None | PublicCftcContract):
        reports (list[PublicCftcReport]): Up to 12 weekly reports, newest first.
        as_of (datetime.datetime | None): When CoinRithm last read the report from CFTC.
        source (PublicCftcSource):
        meta (PublicFreshUntilMeta):
    """

    ticker: str
    coverage: PublicCftcPositioningResponseCoverage
    status: PublicDataStatus
    contract: None | PublicCftcContract
    reports: list[PublicCftcReport]
    as_of: datetime.datetime | None
    source: PublicCftcSource
    meta: PublicFreshUntilMeta
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_cftc_contract import PublicCftcContract

        ticker = self.ticker

        coverage = self.coverage.value

        status = self.status.value

        contract: dict[str, Any] | None
        if isinstance(self.contract, PublicCftcContract):
            contract = self.contract.to_dict()
        else:
            contract = self.contract

        reports = []
        for reports_item_data in self.reports:
            reports_item = reports_item_data.to_dict()
            reports.append(reports_item)

        as_of: None | str
        if isinstance(self.as_of, datetime.datetime):
            as_of = self.as_of.isoformat()
        else:
            as_of = self.as_of

        source = self.source.to_dict()

        meta = self.meta.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "ticker": ticker,
                "coverage": coverage,
                "status": status,
                "contract": contract,
                "reports": reports,
                "asOf": as_of,
                "source": source,
                "meta": meta,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_cftc_contract import PublicCftcContract
        from ..models.public_cftc_report import PublicCftcReport
        from ..models.public_cftc_source import PublicCftcSource
        from ..models.public_fresh_until_meta import PublicFreshUntilMeta

        d = dict(src_dict)
        ticker = d.pop("ticker")

        coverage = PublicCftcPositioningResponseCoverage(d.pop("coverage"))

        status = PublicDataStatus(d.pop("status"))

        def _parse_contract(data: object) -> None | PublicCftcContract:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                contract_type_0 = PublicCftcContract.from_dict(data)

                return contract_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicCftcContract, data)

        contract = _parse_contract(d.pop("contract"))

        reports = []
        _reports = d.pop("reports")
        for reports_item_data in _reports:
            reports_item = PublicCftcReport.from_dict(reports_item_data)

            reports.append(reports_item)

        def _parse_as_of(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                as_of_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return as_of_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        as_of = _parse_as_of(d.pop("asOf"))

        source = PublicCftcSource.from_dict(d.pop("source"))

        meta = PublicFreshUntilMeta.from_dict(d.pop("meta"))

        public_cftc_positioning_response = cls(
            ticker=ticker,
            coverage=coverage,
            status=status,
            contract=contract,
            reports=reports,
            as_of=as_of,
            source=source,
            meta=meta,
        )

        public_cftc_positioning_response.additional_properties = d
        return public_cftc_positioning_response

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
