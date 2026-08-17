from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_coverage import PublicPmCoverage


T = TypeVar("T", bound="PublicPmSourcesResponseSourcesItem")


@_attrs_define
class PublicPmSourcesResponseSourcesItem:
    """
    Attributes:
        id (str | Unset):
        name (str | Unset):
        coverage (None | PublicPmCoverage | Unset): Null until the ledger has computed for this venue.
    """

    id: str | Unset = UNSET
    name: str | Unset = UNSET
    coverage: None | PublicPmCoverage | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_pm_coverage import PublicPmCoverage

        id = self.id

        name = self.name

        coverage: dict[str, Any] | None | Unset
        if isinstance(self.coverage, Unset):
            coverage = UNSET
        elif isinstance(self.coverage, PublicPmCoverage):
            coverage = self.coverage.to_dict()
        else:
            coverage = self.coverage

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if id is not UNSET:
            field_dict["id"] = id
        if name is not UNSET:
            field_dict["name"] = name
        if coverage is not UNSET:
            field_dict["coverage"] = coverage

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_coverage import PublicPmCoverage

        d = dict(src_dict)
        id = d.pop("id", UNSET)

        name = d.pop("name", UNSET)

        def _parse_coverage(data: object) -> None | PublicPmCoverage | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                coverage_type_0 = PublicPmCoverage.from_dict(data)

                return coverage_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicPmCoverage | Unset, data)

        coverage = _parse_coverage(d.pop("coverage", UNSET))

        public_pm_sources_response_sources_item = cls(
            id=id,
            name=name,
            coverage=coverage,
        )

        public_pm_sources_response_sources_item.additional_properties = d
        return public_pm_sources_response_sources_item

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
