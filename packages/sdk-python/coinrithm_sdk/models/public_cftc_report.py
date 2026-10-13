from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_cftc_change import PublicCftcChange
    from ..models.public_cftc_non_commercial_side import PublicCftcNonCommercialSide
    from ..models.public_cftc_side import PublicCftcSide


T = TypeVar("T", bound="PublicCftcReport")


@_attrs_define
class PublicCftcReport:
    """
    Attributes:
        report_date (str): Tuesday the positions are as of, `YYYY-MM-DD`.
        open_interest (float):
        non_commercial (PublicCftcNonCommercialSide):
        commercial (PublicCftcSide):
        non_reportable (None | PublicCftcSide):
        change (PublicCftcChange): Week-over-week changes as computed by CFTC; null when not published.
    """

    report_date: str
    open_interest: float
    non_commercial: PublicCftcNonCommercialSide
    commercial: PublicCftcSide
    non_reportable: None | PublicCftcSide
    change: PublicCftcChange
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_cftc_side import PublicCftcSide

        report_date = self.report_date

        open_interest = self.open_interest

        non_commercial = self.non_commercial.to_dict()

        commercial = self.commercial.to_dict()

        non_reportable: dict[str, Any] | None
        if isinstance(self.non_reportable, PublicCftcSide):
            non_reportable = self.non_reportable.to_dict()
        else:
            non_reportable = self.non_reportable

        change = self.change.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "reportDate": report_date,
                "openInterest": open_interest,
                "nonCommercial": non_commercial,
                "commercial": commercial,
                "nonReportable": non_reportable,
                "change": change,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_cftc_change import PublicCftcChange
        from ..models.public_cftc_non_commercial_side import PublicCftcNonCommercialSide
        from ..models.public_cftc_side import PublicCftcSide

        d = dict(src_dict)
        report_date = d.pop("reportDate")

        open_interest = d.pop("openInterest")

        non_commercial = PublicCftcNonCommercialSide.from_dict(d.pop("nonCommercial"))

        commercial = PublicCftcSide.from_dict(d.pop("commercial"))

        def _parse_non_reportable(data: object) -> None | PublicCftcSide:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                non_reportable_type_0 = PublicCftcSide.from_dict(data)

                return non_reportable_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicCftcSide, data)

        non_reportable = _parse_non_reportable(d.pop("nonReportable"))

        change = PublicCftcChange.from_dict(d.pop("change"))

        public_cftc_report = cls(
            report_date=report_date,
            open_interest=open_interest,
            non_commercial=non_commercial,
            commercial=commercial,
            non_reportable=non_reportable,
            change=change,
        )

        public_cftc_report.additional_properties = d
        return public_cftc_report

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
