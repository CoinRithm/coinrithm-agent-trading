from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.agent_run_outcome_summary_by_venue_futures import AgentRunOutcomeSummaryByVenueFutures
  from ..models.agent_run_outcome_summary_by_venue_pm import AgentRunOutcomeSummaryByVenuePm
  from ..models.agent_run_outcome_summary_by_venue_spot import AgentRunOutcomeSummaryByVenueSpot





T = TypeVar("T", bound="AgentRunOutcomeSummaryByVenue")



@_attrs_define
class AgentRunOutcomeSummaryByVenue:
    """ 
        Attributes:
            spot (AgentRunOutcomeSummaryByVenueSpot | Unset):
            futures (AgentRunOutcomeSummaryByVenueFutures | Unset):
            pm (AgentRunOutcomeSummaryByVenuePm | Unset):
     """

    spot: AgentRunOutcomeSummaryByVenueSpot | Unset = UNSET
    futures: AgentRunOutcomeSummaryByVenueFutures | Unset = UNSET
    pm: AgentRunOutcomeSummaryByVenuePm | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.agent_run_outcome_summary_by_venue_futures import AgentRunOutcomeSummaryByVenueFutures
        from ..models.agent_run_outcome_summary_by_venue_pm import AgentRunOutcomeSummaryByVenuePm
        from ..models.agent_run_outcome_summary_by_venue_spot import AgentRunOutcomeSummaryByVenueSpot
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
        from ..models.agent_run_outcome_summary_by_venue_futures import AgentRunOutcomeSummaryByVenueFutures
        from ..models.agent_run_outcome_summary_by_venue_pm import AgentRunOutcomeSummaryByVenuePm
        from ..models.agent_run_outcome_summary_by_venue_spot import AgentRunOutcomeSummaryByVenueSpot
        d = dict(src_dict)
        _spot = d.pop("spot", UNSET)
        spot: AgentRunOutcomeSummaryByVenueSpot | Unset
        if isinstance(_spot,  Unset):
            spot = UNSET
        else:
            spot = AgentRunOutcomeSummaryByVenueSpot.from_dict(_spot)




        _futures = d.pop("futures", UNSET)
        futures: AgentRunOutcomeSummaryByVenueFutures | Unset
        if isinstance(_futures,  Unset):
            futures = UNSET
        else:
            futures = AgentRunOutcomeSummaryByVenueFutures.from_dict(_futures)




        _pm = d.pop("pm", UNSET)
        pm: AgentRunOutcomeSummaryByVenuePm | Unset
        if isinstance(_pm,  Unset):
            pm = UNSET
        else:
            pm = AgentRunOutcomeSummaryByVenuePm.from_dict(_pm)




        agent_run_outcome_summary_by_venue = cls(
            spot=spot,
            futures=futures,
            pm=pm,
        )


        agent_run_outcome_summary_by_venue.additional_properties = d
        return agent_run_outcome_summary_by_venue

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
