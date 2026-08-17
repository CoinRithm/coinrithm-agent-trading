from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_canonical_detail_response_canonical import PublicPmCanonicalDetailResponseCanonical
    from ..models.public_pm_canonical_detail_response_lineage_item import PublicPmCanonicalDetailResponseLineageItem
    from ..models.public_pm_canonical_detail_response_members_item import PublicPmCanonicalDetailResponseMembersItem
    from ..models.public_pm_canonical_detail_response_merged_into_type_0 import (
        PublicPmCanonicalDetailResponseMergedIntoType0,
    )


T = TypeVar("T", bound="PublicPmCanonicalDetailResponse")


@_attrs_define
class PublicPmCanonicalDetailResponse:
    """
    Attributes:
        canonical (PublicPmCanonicalDetailResponseCanonical):
        members (list[PublicPmCanonicalDetailResponseMembersItem]):
        lineage (list[PublicPmCanonicalDetailResponseLineageItem]):
        merged_into (None | PublicPmCanonicalDetailResponseMergedIntoType0 | Unset):
    """

    canonical: PublicPmCanonicalDetailResponseCanonical
    members: list[PublicPmCanonicalDetailResponseMembersItem]
    lineage: list[PublicPmCanonicalDetailResponseLineageItem]
    merged_into: None | PublicPmCanonicalDetailResponseMergedIntoType0 | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_pm_canonical_detail_response_merged_into_type_0 import (
            PublicPmCanonicalDetailResponseMergedIntoType0,
        )

        canonical = self.canonical.to_dict()

        members = []
        for members_item_data in self.members:
            members_item = members_item_data.to_dict()
            members.append(members_item)

        lineage = []
        for lineage_item_data in self.lineage:
            lineage_item = lineage_item_data.to_dict()
            lineage.append(lineage_item)

        merged_into: dict[str, Any] | None | Unset
        if isinstance(self.merged_into, Unset):
            merged_into = UNSET
        elif isinstance(self.merged_into, PublicPmCanonicalDetailResponseMergedIntoType0):
            merged_into = self.merged_into.to_dict()
        else:
            merged_into = self.merged_into

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "canonical": canonical,
                "members": members,
                "lineage": lineage,
            }
        )
        if merged_into is not UNSET:
            field_dict["mergedInto"] = merged_into

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_canonical_detail_response_canonical import PublicPmCanonicalDetailResponseCanonical
        from ..models.public_pm_canonical_detail_response_lineage_item import PublicPmCanonicalDetailResponseLineageItem
        from ..models.public_pm_canonical_detail_response_members_item import PublicPmCanonicalDetailResponseMembersItem
        from ..models.public_pm_canonical_detail_response_merged_into_type_0 import (
            PublicPmCanonicalDetailResponseMergedIntoType0,
        )

        d = dict(src_dict)
        canonical = PublicPmCanonicalDetailResponseCanonical.from_dict(d.pop("canonical"))

        members = []
        _members = d.pop("members")
        for members_item_data in _members:
            members_item = PublicPmCanonicalDetailResponseMembersItem.from_dict(members_item_data)

            members.append(members_item)

        lineage = []
        _lineage = d.pop("lineage")
        for lineage_item_data in _lineage:
            lineage_item = PublicPmCanonicalDetailResponseLineageItem.from_dict(lineage_item_data)

            lineage.append(lineage_item)

        def _parse_merged_into(data: object) -> None | PublicPmCanonicalDetailResponseMergedIntoType0 | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                merged_into_type_0 = PublicPmCanonicalDetailResponseMergedIntoType0.from_dict(data)

                return merged_into_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicPmCanonicalDetailResponseMergedIntoType0 | Unset, data)

        merged_into = _parse_merged_into(d.pop("mergedInto", UNSET))

        public_pm_canonical_detail_response = cls(
            canonical=canonical,
            members=members,
            lineage=lineage,
            merged_into=merged_into,
        )

        return public_pm_canonical_detail_response
