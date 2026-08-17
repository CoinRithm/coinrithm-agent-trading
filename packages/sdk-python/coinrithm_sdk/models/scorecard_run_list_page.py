from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.scorecard_run_list_entry import ScorecardRunListEntry


T = TypeVar("T", bound="ScorecardRunListPage")


@_attrs_define
class ScorecardRunListPage:
    """A newest-first, keyset-paginated page of compact run history.

    Attributes:
        handle (str | Unset):
        runs (list[ScorecardRunListEntry] | Unset):
        next_before (int | None | Unset): Cursor for the next older page (pass as ?before=); null on the last page.
        limit (int | Unset): The applied page size (clamped to [1,100]).
    """

    handle: str | Unset = UNSET
    runs: list[ScorecardRunListEntry] | Unset = UNSET
    next_before: int | None | Unset = UNSET
    limit: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        handle = self.handle

        runs: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.runs, Unset):
            runs = []
            for runs_item_data in self.runs:
                runs_item = runs_item_data.to_dict()
                runs.append(runs_item)

        next_before: int | None | Unset
        if isinstance(self.next_before, Unset):
            next_before = UNSET
        else:
            next_before = self.next_before

        limit = self.limit

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if handle is not UNSET:
            field_dict["handle"] = handle
        if runs is not UNSET:
            field_dict["runs"] = runs
        if next_before is not UNSET:
            field_dict["nextBefore"] = next_before
        if limit is not UNSET:
            field_dict["limit"] = limit

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.scorecard_run_list_entry import ScorecardRunListEntry

        d = dict(src_dict)
        handle = d.pop("handle", UNSET)

        _runs = d.pop("runs", UNSET)
        runs: list[ScorecardRunListEntry] | Unset = UNSET
        if _runs is not UNSET:
            runs = []
            for runs_item_data in _runs:
                runs_item = ScorecardRunListEntry.from_dict(runs_item_data)

                runs.append(runs_item)

        def _parse_next_before(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        next_before = _parse_next_before(d.pop("nextBefore", UNSET))

        limit = d.pop("limit", UNSET)

        scorecard_run_list_page = cls(
            handle=handle,
            runs=runs,
            next_before=next_before,
            limit=limit,
        )

        scorecard_run_list_page.additional_properties = d
        return scorecard_run_list_page

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
