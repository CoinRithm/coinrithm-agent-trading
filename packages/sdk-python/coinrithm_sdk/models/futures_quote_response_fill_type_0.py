from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.futures_quote_response_fill_type_0_impact_basis import FuturesQuoteResponseFillType0ImpactBasis
from ..models.futures_quote_response_fill_type_0_volume_coverage import FuturesQuoteResponseFillType0VolumeCoverage
from ..types import UNSET, Unset

T = TypeVar("T", bound="FuturesQuoteResponseFillType0")


@_attrs_define
class FuturesQuoteResponseFillType0:
    """Estimated executable fill; null when the futures fill model is disabled.

    Attributes:
        model (str | Unset):
        reference_mark (float | Unset):
        exec_price (float | Unset):
        size_coin (float | Unset):
        adverse_bps (float | Unset):
        adverse_cost_musd (float | Unset):
        impact_bps (float | Unset):
        impact_basis (FuturesQuoteResponseFillType0ImpactBasis | Unset):
        volume_coverage (FuturesQuoteResponseFillType0VolumeCoverage | Unset):
        unavailable (None | str | Unset):
    """

    model: str | Unset = UNSET
    reference_mark: float | Unset = UNSET
    exec_price: float | Unset = UNSET
    size_coin: float | Unset = UNSET
    adverse_bps: float | Unset = UNSET
    adverse_cost_musd: float | Unset = UNSET
    impact_bps: float | Unset = UNSET
    impact_basis: FuturesQuoteResponseFillType0ImpactBasis | Unset = UNSET
    volume_coverage: FuturesQuoteResponseFillType0VolumeCoverage | Unset = UNSET
    unavailable: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        model = self.model

        reference_mark = self.reference_mark

        exec_price = self.exec_price

        size_coin = self.size_coin

        adverse_bps = self.adverse_bps

        adverse_cost_musd = self.adverse_cost_musd

        impact_bps = self.impact_bps

        impact_basis: str | Unset = UNSET
        if not isinstance(self.impact_basis, Unset):
            impact_basis = self.impact_basis.value

        volume_coverage: str | Unset = UNSET
        if not isinstance(self.volume_coverage, Unset):
            volume_coverage = self.volume_coverage.value

        unavailable: None | str | Unset
        if isinstance(self.unavailable, Unset):
            unavailable = UNSET
        else:
            unavailable = self.unavailable

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if model is not UNSET:
            field_dict["model"] = model
        if reference_mark is not UNSET:
            field_dict["referenceMark"] = reference_mark
        if exec_price is not UNSET:
            field_dict["execPrice"] = exec_price
        if size_coin is not UNSET:
            field_dict["sizeCoin"] = size_coin
        if adverse_bps is not UNSET:
            field_dict["adverseBps"] = adverse_bps
        if adverse_cost_musd is not UNSET:
            field_dict["adverseCostMusd"] = adverse_cost_musd
        if impact_bps is not UNSET:
            field_dict["impactBps"] = impact_bps
        if impact_basis is not UNSET:
            field_dict["impactBasis"] = impact_basis
        if volume_coverage is not UNSET:
            field_dict["volumeCoverage"] = volume_coverage
        if unavailable is not UNSET:
            field_dict["unavailable"] = unavailable

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        model = d.pop("model", UNSET)

        reference_mark = d.pop("referenceMark", UNSET)

        exec_price = d.pop("execPrice", UNSET)

        size_coin = d.pop("sizeCoin", UNSET)

        adverse_bps = d.pop("adverseBps", UNSET)

        adverse_cost_musd = d.pop("adverseCostMusd", UNSET)

        impact_bps = d.pop("impactBps", UNSET)

        _impact_basis = d.pop("impactBasis", UNSET)
        impact_basis: FuturesQuoteResponseFillType0ImpactBasis | Unset
        if isinstance(_impact_basis, Unset):
            impact_basis = UNSET
        else:
            impact_basis = FuturesQuoteResponseFillType0ImpactBasis(_impact_basis)

        _volume_coverage = d.pop("volumeCoverage", UNSET)
        volume_coverage: FuturesQuoteResponseFillType0VolumeCoverage | Unset
        if isinstance(_volume_coverage, Unset):
            volume_coverage = UNSET
        else:
            volume_coverage = FuturesQuoteResponseFillType0VolumeCoverage(_volume_coverage)

        def _parse_unavailable(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        unavailable = _parse_unavailable(d.pop("unavailable", UNSET))

        futures_quote_response_fill_type_0 = cls(
            model=model,
            reference_mark=reference_mark,
            exec_price=exec_price,
            size_coin=size_coin,
            adverse_bps=adverse_bps,
            adverse_cost_musd=adverse_cost_musd,
            impact_bps=impact_bps,
            impact_basis=impact_basis,
            volume_coverage=volume_coverage,
            unavailable=unavailable,
        )

        futures_quote_response_fill_type_0.additional_properties = d
        return futures_quote_response_fill_type_0

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
