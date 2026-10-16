from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_instrument_markets_reference_kind import PublicInstrumentMarketsReferenceKind
from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicInstrumentMarketsReference")


@_attrs_define
class PublicInstrumentMarketsReference:
    """The live series to read for a current-price marker. The payload carries no price.

    Attributes:
        kind (PublicInstrumentMarketsReferenceKind):
        key (str):
        label (str | Unset):
    """

    kind: PublicInstrumentMarketsReferenceKind
    key: str
    label: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        kind = self.kind.value

        key = self.key

        label = self.label

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "kind": kind,
                "key": key,
            }
        )
        if label is not UNSET:
            field_dict["label"] = label

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        kind = PublicInstrumentMarketsReferenceKind(d.pop("kind"))

        key = d.pop("key")

        label = d.pop("label", UNSET)

        public_instrument_markets_reference = cls(
            kind=kind,
            key=key,
            label=label,
        )

        public_instrument_markets_reference.additional_properties = d
        return public_instrument_markets_reference

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
