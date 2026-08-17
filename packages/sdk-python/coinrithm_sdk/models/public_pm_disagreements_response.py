from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_disagreements_response_data_item import PublicPmDisagreementsResponseDataItem
    from ..models.public_pm_disagreements_response_meta import PublicPmDisagreementsResponseMeta
    from ..models.public_pm_disagreements_response_pagination import PublicPmDisagreementsResponsePagination


T = TypeVar("T", bound="PublicPmDisagreementsResponse")


@_attrs_define
class PublicPmDisagreementsResponse:
    """
    Attributes:
        data (list[PublicPmDisagreementsResponseDataItem]): Graph-clustered disagreement rows. Each cluster carries
            clusterId,
            primaryEventId, title, events[] (PublicPmEvent rows), comparisons[]
            (per-pair matchId/confidence/matchMethod/divergence + a comparison
            with per-outcome eventAProbability/eventBProbability/deltaPoints),
            maxOverallGap, maxOutcomeGap, maxConfidence, and referenceProbability
            when available.
        total (int):
        has_more (bool):
        pagination (PublicPmDisagreementsResponsePagination):
        meta (PublicPmDisagreementsResponseMeta | Unset):
    """

    data: list[PublicPmDisagreementsResponseDataItem]
    total: int
    has_more: bool
    pagination: PublicPmDisagreementsResponsePagination
    meta: PublicPmDisagreementsResponseMeta | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        data = []
        for data_item_data in self.data:
            data_item = data_item_data.to_dict()
            data.append(data_item)

        total = self.total

        has_more = self.has_more

        pagination = self.pagination.to_dict()

        meta: dict[str, Any] | Unset = UNSET
        if not isinstance(self.meta, Unset):
            meta = self.meta.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "data": data,
                "total": total,
                "hasMore": has_more,
                "pagination": pagination,
            }
        )
        if meta is not UNSET:
            field_dict["meta"] = meta

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_disagreements_response_data_item import PublicPmDisagreementsResponseDataItem
        from ..models.public_pm_disagreements_response_meta import PublicPmDisagreementsResponseMeta
        from ..models.public_pm_disagreements_response_pagination import PublicPmDisagreementsResponsePagination

        d = dict(src_dict)
        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = PublicPmDisagreementsResponseDataItem.from_dict(data_item_data)

            data.append(data_item)

        total = d.pop("total")

        has_more = d.pop("hasMore")

        pagination = PublicPmDisagreementsResponsePagination.from_dict(d.pop("pagination"))

        _meta = d.pop("meta", UNSET)
        meta: PublicPmDisagreementsResponseMeta | Unset
        if isinstance(_meta, Unset):
            meta = UNSET
        else:
            meta = PublicPmDisagreementsResponseMeta.from_dict(_meta)

        public_pm_disagreements_response = cls(
            data=data,
            total=total,
            has_more=has_more,
            pagination=pagination,
            meta=meta,
        )

        return public_pm_disagreements_response
