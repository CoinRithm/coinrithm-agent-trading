from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicInstrumentMarketContractParse")


@_attrs_define
class PublicInstrumentMarketContractParse:
    """
    Attributes:
        method (str | Unset):
        parser_version (str | Unset):
        confidence (float | Unset):
    """

    method: str | Unset = UNSET
    parser_version: str | Unset = UNSET
    confidence: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        method = self.method

        parser_version = self.parser_version

        confidence = self.confidence

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if method is not UNSET:
            field_dict["method"] = method
        if parser_version is not UNSET:
            field_dict["parserVersion"] = parser_version
        if confidence is not UNSET:
            field_dict["confidence"] = confidence

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        method = d.pop("method", UNSET)

        parser_version = d.pop("parserVersion", UNSET)

        confidence = d.pop("confidence", UNSET)

        public_instrument_market_contract_parse = cls(
            method=method,
            parser_version=parser_version,
            confidence=confidence,
        )

        public_instrument_market_contract_parse.additional_properties = d
        return public_instrument_market_contract_parse

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
