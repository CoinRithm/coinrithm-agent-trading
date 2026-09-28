from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_canonical_consensus import PublicPmCanonicalConsensus
    from ..models.public_pm_canonical_consensus_point import PublicPmCanonicalConsensusPoint
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
        consensus (None | PublicPmCanonicalConsensus | Unset): Current cross-venue consensus for this question, or null
            when no
            open member holds a current reference that passes selection. Absent
            on a merged canonical.
        consensus_history (list[PublicPmCanonicalConsensusPoint] | Unset): Daily consensus tape, oldest first, up to 90
            days. A series is
            returned only when one outcome identity holds for the whole window;
            otherwise it is empty. Each point carries its own row's identity.
            Absent on a merged canonical.
    """

    canonical: PublicPmCanonicalDetailResponseCanonical
    members: list[PublicPmCanonicalDetailResponseMembersItem]
    lineage: list[PublicPmCanonicalDetailResponseLineageItem]
    merged_into: None | PublicPmCanonicalDetailResponseMergedIntoType0 | Unset = UNSET
    consensus: None | PublicPmCanonicalConsensus | Unset = UNSET
    consensus_history: list[PublicPmCanonicalConsensusPoint] | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_pm_canonical_consensus import PublicPmCanonicalConsensus
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

        consensus: dict[str, Any] | None | Unset
        if isinstance(self.consensus, Unset):
            consensus = UNSET
        elif isinstance(self.consensus, PublicPmCanonicalConsensus):
            consensus = self.consensus.to_dict()
        else:
            consensus = self.consensus

        consensus_history: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.consensus_history, Unset):
            consensus_history = []
            for consensus_history_item_data in self.consensus_history:
                consensus_history_item = consensus_history_item_data.to_dict()
                consensus_history.append(consensus_history_item)

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
        if consensus is not UNSET:
            field_dict["consensus"] = consensus
        if consensus_history is not UNSET:
            field_dict["consensusHistory"] = consensus_history

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_canonical_consensus import PublicPmCanonicalConsensus
        from ..models.public_pm_canonical_consensus_point import PublicPmCanonicalConsensusPoint
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

        def _parse_consensus(data: object) -> None | PublicPmCanonicalConsensus | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                consensus_type_0 = PublicPmCanonicalConsensus.from_dict(data)

                return consensus_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicPmCanonicalConsensus | Unset, data)

        consensus = _parse_consensus(d.pop("consensus", UNSET))

        _consensus_history = d.pop("consensusHistory", UNSET)
        consensus_history: list[PublicPmCanonicalConsensusPoint] | Unset = UNSET
        if _consensus_history is not UNSET:
            consensus_history = []
            for consensus_history_item_data in _consensus_history:
                consensus_history_item = PublicPmCanonicalConsensusPoint.from_dict(consensus_history_item_data)

                consensus_history.append(consensus_history_item)

        public_pm_canonical_detail_response = cls(
            canonical=canonical,
            members=members,
            lineage=lineage,
            merged_into=merged_into,
            consensus=consensus,
            consensus_history=consensus_history,
        )

        return public_pm_canonical_detail_response
