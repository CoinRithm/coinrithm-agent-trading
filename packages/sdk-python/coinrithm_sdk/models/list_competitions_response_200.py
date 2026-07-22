from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime

if TYPE_CHECKING:
  from ..models.competition_meta import CompetitionMeta





T = TypeVar("T", bound="ListCompetitionsResponse200")



@_attrs_define
class ListCompetitionsResponse200:
    """ 
        Attributes:
            competitions (list[CompetitionMeta] | Unset):
            as_of (datetime.datetime | Unset):
     """

    competitions: list[CompetitionMeta] | Unset = UNSET
    as_of: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.competition_meta import CompetitionMeta
        competitions: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.competitions, Unset):
            competitions = []
            for competitions_item_data in self.competitions:
                competitions_item = competitions_item_data.to_dict()
                competitions.append(competitions_item)



        as_of: str | Unset = UNSET
        if not isinstance(self.as_of, Unset):
            as_of = self.as_of.isoformat()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if competitions is not UNSET:
            field_dict["competitions"] = competitions
        if as_of is not UNSET:
            field_dict["asOf"] = as_of

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.competition_meta import CompetitionMeta
        d = dict(src_dict)
        _competitions = d.pop("competitions", UNSET)
        competitions: list[CompetitionMeta] | Unset = UNSET
        if _competitions is not UNSET:
            competitions = []
            for competitions_item_data in _competitions:
                competitions_item = CompetitionMeta.from_dict(competitions_item_data)



                competitions.append(competitions_item)


        _as_of = d.pop("asOf", UNSET)
        as_of: datetime.datetime | Unset
        if isinstance(_as_of,  Unset):
            as_of = UNSET
        else:
            as_of = isoparse(_as_of)




        list_competitions_response_200 = cls(
            competitions=competitions,
            as_of=as_of,
        )


        list_competitions_response_200.additional_properties = d
        return list_competitions_response_200

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
