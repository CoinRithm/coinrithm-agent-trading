from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.resolve_symbol_response_200_alternatives_item import ResolveSymbolResponse200AlternativesItem
  from ..models.resolve_symbol_response_200_match_type_0 import ResolveSymbolResponse200MatchType0





T = TypeVar("T", bound="ResolveSymbolResponse200")



@_attrs_define
class ResolveSymbolResponse200:
    """ 
        Attributes:
            query (str | Unset):
            match (None | ResolveSymbolResponse200MatchType0 | Unset):
            alternatives (list[ResolveSymbolResponse200AlternativesItem] | Unset):
     """

    query: str | Unset = UNSET
    match: None | ResolveSymbolResponse200MatchType0 | Unset = UNSET
    alternatives: list[ResolveSymbolResponse200AlternativesItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.resolve_symbol_response_200_alternatives_item import ResolveSymbolResponse200AlternativesItem
        from ..models.resolve_symbol_response_200_match_type_0 import ResolveSymbolResponse200MatchType0
        query = self.query

        match: dict[str, Any] | None | Unset
        if isinstance(self.match, Unset):
            match = UNSET
        elif isinstance(self.match, ResolveSymbolResponse200MatchType0):
            match = self.match.to_dict()
        else:
            match = self.match

        alternatives: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.alternatives, Unset):
            alternatives = []
            for alternatives_item_data in self.alternatives:
                alternatives_item = alternatives_item_data.to_dict()
                alternatives.append(alternatives_item)




        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if query is not UNSET:
            field_dict["query"] = query
        if match is not UNSET:
            field_dict["match"] = match
        if alternatives is not UNSET:
            field_dict["alternatives"] = alternatives

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.resolve_symbol_response_200_alternatives_item import ResolveSymbolResponse200AlternativesItem
        from ..models.resolve_symbol_response_200_match_type_0 import ResolveSymbolResponse200MatchType0
        d = dict(src_dict)
        query = d.pop("query", UNSET)

        def _parse_match(data: object) -> None | ResolveSymbolResponse200MatchType0 | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                match_type_0 = ResolveSymbolResponse200MatchType0.from_dict(data)



                return match_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | ResolveSymbolResponse200MatchType0 | Unset, data)

        match = _parse_match(d.pop("match", UNSET))


        _alternatives = d.pop("alternatives", UNSET)
        alternatives: list[ResolveSymbolResponse200AlternativesItem] | Unset = UNSET
        if _alternatives is not UNSET:
            alternatives = []
            for alternatives_item_data in _alternatives:
                alternatives_item = ResolveSymbolResponse200AlternativesItem.from_dict(alternatives_item_data)



                alternatives.append(alternatives_item)


        resolve_symbol_response_200 = cls(
            query=query,
            match=match,
            alternatives=alternatives,
        )


        resolve_symbol_response_200.additional_properties = d
        return resolve_symbol_response_200

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
