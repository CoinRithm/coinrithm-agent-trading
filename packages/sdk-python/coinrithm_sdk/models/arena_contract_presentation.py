from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="ArenaContractPresentation")


@_attrs_define
class ArenaContractPresentation:
    """
    Attributes:
        small_sample_below_decided_trades (Literal[20]):
    """

    small_sample_below_decided_trades: Literal[20]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        small_sample_below_decided_trades = self.small_sample_below_decided_trades

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "smallSampleBelowDecidedTrades": small_sample_below_decided_trades,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        small_sample_below_decided_trades = cast(Literal[20], d.pop("smallSampleBelowDecidedTrades"))
        if small_sample_below_decided_trades != 20:
            raise ValueError(
                f"smallSampleBelowDecidedTrades must match const 20, got '{small_sample_below_decided_trades}'"
            )

        arena_contract_presentation = cls(
            small_sample_below_decided_trades=small_sample_below_decided_trades,
        )

        arena_contract_presentation.additional_properties = d
        return arena_contract_presentation

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
