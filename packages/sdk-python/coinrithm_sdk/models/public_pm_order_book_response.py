from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..models.public_pm_source_slug import PublicPmSourceSlug

if TYPE_CHECKING:
    from ..models.public_pm_microstructure_outcome_type_0 import PublicPmMicrostructureOutcomeType0
    from ..models.public_pm_order_book_type_0 import PublicPmOrderBookType0


T = TypeVar("T", bound="PublicPmOrderBookResponse")


@_attrs_define
class PublicPmOrderBookResponse:
    """
    Attributes:
        source (PublicPmSourceSlug):
        slug (str):
        outcome (None | PublicPmMicrostructureOutcomeType0): Which outcome this microstructure read describes; null when
            the event has neither an outcome name nor id.
        order_book (None | PublicPmOrderBookType0): Null when the source has no book endpoint or none is currently
            resting — a valid empty shape, not an error.
    """

    source: PublicPmSourceSlug
    slug: str
    outcome: None | PublicPmMicrostructureOutcomeType0
    order_book: None | PublicPmOrderBookType0

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_pm_microstructure_outcome_type_0 import PublicPmMicrostructureOutcomeType0
        from ..models.public_pm_order_book_type_0 import PublicPmOrderBookType0

        source = self.source.value

        slug = self.slug

        outcome: dict[str, Any] | None
        if isinstance(self.outcome, PublicPmMicrostructureOutcomeType0):
            outcome = self.outcome.to_dict()
        else:
            outcome = self.outcome

        order_book: dict[str, Any] | None
        if isinstance(self.order_book, PublicPmOrderBookType0):
            order_book = self.order_book.to_dict()
        else:
            order_book = self.order_book

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "source": source,
                "slug": slug,
                "outcome": outcome,
                "orderBook": order_book,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_microstructure_outcome_type_0 import PublicPmMicrostructureOutcomeType0
        from ..models.public_pm_order_book_type_0 import PublicPmOrderBookType0

        d = dict(src_dict)
        source = PublicPmSourceSlug(d.pop("source"))

        slug = d.pop("slug")

        def _parse_outcome(data: object) -> None | PublicPmMicrostructureOutcomeType0:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_public_pm_microstructure_outcome_type_0 = (
                    PublicPmMicrostructureOutcomeType0.from_dict(data)
                )

                return componentsschemas_public_pm_microstructure_outcome_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicPmMicrostructureOutcomeType0, data)

        outcome = _parse_outcome(d.pop("outcome"))

        def _parse_order_book(data: object) -> None | PublicPmOrderBookType0:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_public_pm_order_book_type_0 = PublicPmOrderBookType0.from_dict(data)

                return componentsschemas_public_pm_order_book_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicPmOrderBookType0, data)

        order_book = _parse_order_book(d.pop("orderBook"))

        public_pm_order_book_response = cls(
            source=source,
            slug=slug,
            outcome=outcome,
            order_book=order_book,
        )

        return public_pm_order_book_response
