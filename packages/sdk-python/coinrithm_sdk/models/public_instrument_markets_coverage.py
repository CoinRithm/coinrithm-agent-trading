from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicInstrumentMarketsCoverage")


@_attrs_define
class PublicInstrumentMarketsCoverage:
    """
    Attributes:
        venues (list[str]):
        ladders (int):
        contracts (int):
        truncated (bool):
        degraded (bool | Unset): The contract read failed; render nothing rather than an error.
        excluded (list[str] | Unset):
    """

    venues: list[str]
    ladders: int
    contracts: int
    truncated: bool
    degraded: bool | Unset = UNSET
    excluded: list[str] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        venues = self.venues

        ladders = self.ladders

        contracts = self.contracts

        truncated = self.truncated

        degraded = self.degraded

        excluded: list[str] | Unset = UNSET
        if not isinstance(self.excluded, Unset):
            excluded = self.excluded

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "venues": venues,
                "ladders": ladders,
                "contracts": contracts,
                "truncated": truncated,
            }
        )
        if degraded is not UNSET:
            field_dict["degraded"] = degraded
        if excluded is not UNSET:
            field_dict["excluded"] = excluded

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        venues = cast(list[str], d.pop("venues"))

        ladders = d.pop("ladders")

        contracts = d.pop("contracts")

        truncated = d.pop("truncated")

        degraded = d.pop("degraded", UNSET)

        excluded = cast(list[str], d.pop("excluded", UNSET))

        public_instrument_markets_coverage = cls(
            venues=venues,
            ladders=ladders,
            contracts=contracts,
            truncated=truncated,
            degraded=degraded,
            excluded=excluded,
        )

        public_instrument_markets_coverage.additional_properties = d
        return public_instrument_markets_coverage

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
