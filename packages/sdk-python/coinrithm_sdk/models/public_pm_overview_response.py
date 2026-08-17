from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.public_pm_overview_response_by_category_item import PublicPmOverviewResponseByCategoryItem
    from ..models.public_pm_overview_response_by_source_item import PublicPmOverviewResponseBySourceItem
    from ..models.public_pm_overview_response_categories_item_type_1 import PublicPmOverviewResponseCategoriesItemType1
    from ..models.public_pm_overview_response_highlights import PublicPmOverviewResponseHighlights
    from ..models.public_pm_overview_response_stats import PublicPmOverviewResponseStats


T = TypeVar("T", bound="PublicPmOverviewResponse")


@_attrs_define
class PublicPmOverviewResponse:
    """
    Attributes:
        stats (PublicPmOverviewResponseStats):
        highlights (PublicPmOverviewResponseHighlights):
        categories (list[PublicPmOverviewResponseCategoriesItemType1 | str]):
        by_source (list[PublicPmOverviewResponseBySourceItem]):
        by_category (list[PublicPmOverviewResponseByCategoryItem]):
        updated_at (datetime.datetime):
    """

    stats: PublicPmOverviewResponseStats
    highlights: PublicPmOverviewResponseHighlights
    categories: list[PublicPmOverviewResponseCategoriesItemType1 | str]
    by_source: list[PublicPmOverviewResponseBySourceItem]
    by_category: list[PublicPmOverviewResponseByCategoryItem]
    updated_at: datetime.datetime

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_pm_overview_response_categories_item_type_1 import (
            PublicPmOverviewResponseCategoriesItemType1,
        )

        stats = self.stats.to_dict()

        highlights = self.highlights.to_dict()

        categories = []
        for categories_item_data in self.categories:
            categories_item: dict[str, Any] | str
            if isinstance(categories_item_data, PublicPmOverviewResponseCategoriesItemType1):
                categories_item = categories_item_data.to_dict()
            else:
                categories_item = categories_item_data
            categories.append(categories_item)

        by_source = []
        for by_source_item_data in self.by_source:
            by_source_item = by_source_item_data.to_dict()
            by_source.append(by_source_item)

        by_category = []
        for by_category_item_data in self.by_category:
            by_category_item = by_category_item_data.to_dict()
            by_category.append(by_category_item)

        updated_at = self.updated_at.isoformat()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "stats": stats,
                "highlights": highlights,
                "categories": categories,
                "bySource": by_source,
                "byCategory": by_category,
                "updatedAt": updated_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_overview_response_by_category_item import PublicPmOverviewResponseByCategoryItem
        from ..models.public_pm_overview_response_by_source_item import PublicPmOverviewResponseBySourceItem
        from ..models.public_pm_overview_response_categories_item_type_1 import (
            PublicPmOverviewResponseCategoriesItemType1,
        )
        from ..models.public_pm_overview_response_highlights import PublicPmOverviewResponseHighlights
        from ..models.public_pm_overview_response_stats import PublicPmOverviewResponseStats

        d = dict(src_dict)
        stats = PublicPmOverviewResponseStats.from_dict(d.pop("stats"))

        highlights = PublicPmOverviewResponseHighlights.from_dict(d.pop("highlights"))

        categories = []
        _categories = d.pop("categories")
        for categories_item_data in _categories:

            def _parse_categories_item(data: object) -> PublicPmOverviewResponseCategoriesItemType1 | str:
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    categories_item_type_1 = PublicPmOverviewResponseCategoriesItemType1.from_dict(data)

                    return categories_item_type_1
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                return cast(PublicPmOverviewResponseCategoriesItemType1 | str, data)

            categories_item = _parse_categories_item(categories_item_data)

            categories.append(categories_item)

        by_source = []
        _by_source = d.pop("bySource")
        for by_source_item_data in _by_source:
            by_source_item = PublicPmOverviewResponseBySourceItem.from_dict(by_source_item_data)

            by_source.append(by_source_item)

        by_category = []
        _by_category = d.pop("byCategory")
        for by_category_item_data in _by_category:
            by_category_item = PublicPmOverviewResponseByCategoryItem.from_dict(by_category_item_data)

            by_category.append(by_category_item)

        updated_at = datetime.datetime.fromisoformat(d.pop("updatedAt"))

        public_pm_overview_response = cls(
            stats=stats,
            highlights=highlights,
            categories=categories,
            by_source=by_source,
            by_category=by_category,
            updated_at=updated_at,
        )

        return public_pm_overview_response
