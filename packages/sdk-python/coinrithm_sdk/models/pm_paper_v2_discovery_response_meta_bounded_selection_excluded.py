from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PmPaperV2DiscoveryResponseMetaBoundedSelectionExcluded")


@_attrs_define
class PmPaperV2DiscoveryResponseMetaBoundedSelectionExcluded:
    """Outcomes removed, counted by reason:
    `native_identity_unavailable`, `unsupported_terminal_contract`,
    `native_maturity_unknown`, `native_maturity_expired`,
    `native_maturity_beyond_horizon`.

    """

    additional_properties: dict[str, int] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        pm_paper_v2_discovery_response_meta_bounded_selection_excluded = cls()

        pm_paper_v2_discovery_response_meta_bounded_selection_excluded.additional_properties = d
        return pm_paper_v2_discovery_response_meta_bounded_selection_excluded

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> int:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: int) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
