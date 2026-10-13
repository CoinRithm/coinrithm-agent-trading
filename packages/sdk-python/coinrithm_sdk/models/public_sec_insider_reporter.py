from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicSecInsiderReporter")


@_attrs_define
class PublicSecInsiderReporter:
    """
    Attributes:
        name (str): First reporting person on the form.
        cik (int | None):
        count (int): Joint filers on the same Form 4.
        relationship (str): Display summary such as `Director, Chief Executive Officer`.
        is_director (bool):
        is_officer (bool):
        is_ten_percent_owner (bool):
        is_other (bool):
        officer_title (None | str):
    """

    name: str
    cik: int | None
    count: int
    relationship: str
    is_director: bool
    is_officer: bool
    is_ten_percent_owner: bool
    is_other: bool
    officer_title: None | str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        cik: int | None
        cik = self.cik

        count = self.count

        relationship = self.relationship

        is_director = self.is_director

        is_officer = self.is_officer

        is_ten_percent_owner = self.is_ten_percent_owner

        is_other = self.is_other

        officer_title: None | str
        officer_title = self.officer_title

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "cik": cik,
                "count": count,
                "relationship": relationship,
                "isDirector": is_director,
                "isOfficer": is_officer,
                "isTenPercentOwner": is_ten_percent_owner,
                "isOther": is_other,
                "officerTitle": officer_title,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        def _parse_cik(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        cik = _parse_cik(d.pop("cik"))

        count = d.pop("count")

        relationship = d.pop("relationship")

        is_director = d.pop("isDirector")

        is_officer = d.pop("isOfficer")

        is_ten_percent_owner = d.pop("isTenPercentOwner")

        is_other = d.pop("isOther")

        def _parse_officer_title(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        officer_title = _parse_officer_title(d.pop("officerTitle"))

        public_sec_insider_reporter = cls(
            name=name,
            cik=cik,
            count=count,
            relationship=relationship,
            is_director=is_director,
            is_officer=is_officer,
            is_ten_percent_owner=is_ten_percent_owner,
            is_other=is_other,
            officer_title=officer_title,
        )

        public_sec_insider_reporter.additional_properties = d
        return public_sec_insider_reporter

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
