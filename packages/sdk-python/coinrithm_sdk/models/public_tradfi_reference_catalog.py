from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_tradfi_reference_catalog_item import PublicTradfiReferenceCatalogItem
    from ..models.public_tradfi_reference_methodology import PublicTradfiReferenceMethodology


T = TypeVar("T", bound="PublicTradfiReferenceCatalog")


@_attrs_define
class PublicTradfiReferenceCatalog:
    """
    Attributes:
        version (int):
        generated_at (datetime.datetime): Original payload creation time, retained on a cache hit.
        methodology (PublicTradfiReferenceMethodology):
        count (int):
        items (list[PublicTradfiReferenceCatalogItem]):
    """

    version: int
    generated_at: datetime.datetime
    methodology: PublicTradfiReferenceMethodology
    count: int
    items: list[PublicTradfiReferenceCatalogItem]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        version = self.version

        generated_at = self.generated_at.isoformat()

        methodology = self.methodology.to_dict()

        count = self.count

        items = []
        for items_item_data in self.items:
            items_item = items_item_data.to_dict()
            items.append(items_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "version": version,
                "generatedAt": generated_at,
                "methodology": methodology,
                "count": count,
                "items": items,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_tradfi_reference_catalog_item import PublicTradfiReferenceCatalogItem
        from ..models.public_tradfi_reference_methodology import PublicTradfiReferenceMethodology

        d = dict(src_dict)
        version = d.pop("version")

        generated_at = datetime.datetime.fromisoformat(d.pop("generatedAt").replace("Z", "+00:00"))

        methodology = PublicTradfiReferenceMethodology.from_dict(d.pop("methodology"))

        count = d.pop("count")

        items = []
        _items = d.pop("items")
        for items_item_data in _items:
            items_item = PublicTradfiReferenceCatalogItem.from_dict(items_item_data)

            items.append(items_item)

        public_tradfi_reference_catalog = cls(
            version=version,
            generated_at=generated_at,
            methodology=methodology,
            count=count,
            items=items,
        )

        public_tradfi_reference_catalog.additional_properties = d
        return public_tradfi_reference_catalog

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
