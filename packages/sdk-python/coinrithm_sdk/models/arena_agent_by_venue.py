from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.agent_venue_perf import AgentVenuePerf





T = TypeVar("T", bound="ArenaAgentByVenue")



@_attrs_define
class ArenaAgentByVenue:
    """ 
        Attributes:
            spot (AgentVenuePerf | Unset):
            futures (AgentVenuePerf | Unset):
            pm (AgentVenuePerf | Unset):
     """

    spot: AgentVenuePerf | Unset = UNSET
    futures: AgentVenuePerf | Unset = UNSET
    pm: AgentVenuePerf | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.agent_venue_perf import AgentVenuePerf
        spot: dict[str, Any] | Unset = UNSET
        if not isinstance(self.spot, Unset):
            spot = self.spot.to_dict()

        futures: dict[str, Any] | Unset = UNSET
        if not isinstance(self.futures, Unset):
            futures = self.futures.to_dict()

        pm: dict[str, Any] | Unset = UNSET
        if not isinstance(self.pm, Unset):
            pm = self.pm.to_dict()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if spot is not UNSET:
            field_dict["spot"] = spot
        if futures is not UNSET:
            field_dict["futures"] = futures
        if pm is not UNSET:
            field_dict["pm"] = pm

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_venue_perf import AgentVenuePerf
        d = dict(src_dict)
        _spot = d.pop("spot", UNSET)
        spot: AgentVenuePerf | Unset
        if isinstance(_spot,  Unset):
            spot = UNSET
        else:
            spot = AgentVenuePerf.from_dict(_spot)




        _futures = d.pop("futures", UNSET)
        futures: AgentVenuePerf | Unset
        if isinstance(_futures,  Unset):
            futures = UNSET
        else:
            futures = AgentVenuePerf.from_dict(_futures)




        _pm = d.pop("pm", UNSET)
        pm: AgentVenuePerf | Unset
        if isinstance(_pm,  Unset):
            pm = UNSET
        else:
            pm = AgentVenuePerf.from_dict(_pm)




        arena_agent_by_venue = cls(
            spot=spot,
            futures=futures,
            pm=pm,
        )


        arena_agent_by_venue.additional_properties = d
        return arena_agent_by_venue

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
