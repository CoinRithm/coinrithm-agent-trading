from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmComparisonSummary")


@_attrs_define
class PublicPmComparisonSummary:
    """
    Attributes:
        overall_delta_points (float | Unset):
        max_outcome_delta_points (float | Unset): Largest gap over all outcomes, including ones only one venue lists.
        max_outcome_label (None | str | Unset):
        max_shared_outcome_delta_points (float | Unset): Largest gap among outcomes both venues list. With the trading-
            evidence rule on, only rows with `bothSidesTraded: true` set it.
        max_shared_outcome_label (None | str | Unset):
        matched_outcome_count (int | Unset):
        total_outcome_count (int | Unset):
        book_structure_a (str | Unset): `independent`, `exclusive` or `incomplete`; two books produce a shared-outcome
            gap only when both are independent or both exclusive.
        book_structure_b (str | Unset): As `bookStructureA`, for event B.
        comparable_books (bool | Unset):
        evidenced_shared_outcome_count (int | Unset): Shared rows whose two legs both show trading (`bothSidesTraded`
            true). Present while the server's trading-evidence rule is on.
    """

    overall_delta_points: float | Unset = UNSET
    max_outcome_delta_points: float | Unset = UNSET
    max_outcome_label: None | str | Unset = UNSET
    max_shared_outcome_delta_points: float | Unset = UNSET
    max_shared_outcome_label: None | str | Unset = UNSET
    matched_outcome_count: int | Unset = UNSET
    total_outcome_count: int | Unset = UNSET
    book_structure_a: str | Unset = UNSET
    book_structure_b: str | Unset = UNSET
    comparable_books: bool | Unset = UNSET
    evidenced_shared_outcome_count: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        overall_delta_points = self.overall_delta_points

        max_outcome_delta_points = self.max_outcome_delta_points

        max_outcome_label: None | str | Unset
        if isinstance(self.max_outcome_label, Unset):
            max_outcome_label = UNSET
        else:
            max_outcome_label = self.max_outcome_label

        max_shared_outcome_delta_points = self.max_shared_outcome_delta_points

        max_shared_outcome_label: None | str | Unset
        if isinstance(self.max_shared_outcome_label, Unset):
            max_shared_outcome_label = UNSET
        else:
            max_shared_outcome_label = self.max_shared_outcome_label

        matched_outcome_count = self.matched_outcome_count

        total_outcome_count = self.total_outcome_count

        book_structure_a = self.book_structure_a

        book_structure_b = self.book_structure_b

        comparable_books = self.comparable_books

        evidenced_shared_outcome_count = self.evidenced_shared_outcome_count

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if overall_delta_points is not UNSET:
            field_dict["overallDeltaPoints"] = overall_delta_points
        if max_outcome_delta_points is not UNSET:
            field_dict["maxOutcomeDeltaPoints"] = max_outcome_delta_points
        if max_outcome_label is not UNSET:
            field_dict["maxOutcomeLabel"] = max_outcome_label
        if max_shared_outcome_delta_points is not UNSET:
            field_dict["maxSharedOutcomeDeltaPoints"] = max_shared_outcome_delta_points
        if max_shared_outcome_label is not UNSET:
            field_dict["maxSharedOutcomeLabel"] = max_shared_outcome_label
        if matched_outcome_count is not UNSET:
            field_dict["matchedOutcomeCount"] = matched_outcome_count
        if total_outcome_count is not UNSET:
            field_dict["totalOutcomeCount"] = total_outcome_count
        if book_structure_a is not UNSET:
            field_dict["bookStructureA"] = book_structure_a
        if book_structure_b is not UNSET:
            field_dict["bookStructureB"] = book_structure_b
        if comparable_books is not UNSET:
            field_dict["comparableBooks"] = comparable_books
        if evidenced_shared_outcome_count is not UNSET:
            field_dict["evidencedSharedOutcomeCount"] = evidenced_shared_outcome_count

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        overall_delta_points = d.pop("overallDeltaPoints", UNSET)

        max_outcome_delta_points = d.pop("maxOutcomeDeltaPoints", UNSET)

        def _parse_max_outcome_label(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        max_outcome_label = _parse_max_outcome_label(d.pop("maxOutcomeLabel", UNSET))

        max_shared_outcome_delta_points = d.pop("maxSharedOutcomeDeltaPoints", UNSET)

        def _parse_max_shared_outcome_label(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        max_shared_outcome_label = _parse_max_shared_outcome_label(d.pop("maxSharedOutcomeLabel", UNSET))

        matched_outcome_count = d.pop("matchedOutcomeCount", UNSET)

        total_outcome_count = d.pop("totalOutcomeCount", UNSET)

        book_structure_a = d.pop("bookStructureA", UNSET)

        book_structure_b = d.pop("bookStructureB", UNSET)

        comparable_books = d.pop("comparableBooks", UNSET)

        evidenced_shared_outcome_count = d.pop("evidencedSharedOutcomeCount", UNSET)

        public_pm_comparison_summary = cls(
            overall_delta_points=overall_delta_points,
            max_outcome_delta_points=max_outcome_delta_points,
            max_outcome_label=max_outcome_label,
            max_shared_outcome_delta_points=max_shared_outcome_delta_points,
            max_shared_outcome_label=max_shared_outcome_label,
            matched_outcome_count=matched_outcome_count,
            total_outcome_count=total_outcome_count,
            book_structure_a=book_structure_a,
            book_structure_b=book_structure_b,
            comparable_books=comparable_books,
            evidenced_shared_outcome_count=evidenced_shared_outcome_count,
        )

        public_pm_comparison_summary.additional_properties = d
        return public_pm_comparison_summary

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
