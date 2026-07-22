from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="AgentExecutionAssumptionsCostModel")



@_attrs_define
class AgentExecutionAssumptionsCostModel:
    """ 
        Attributes:
            spot (str | Unset):
            futures (str | Unset):
            prediction_markets (str | Unset):
     """

    spot: str | Unset = UNSET
    futures: str | Unset = UNSET
    prediction_markets: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        spot = self.spot

        futures = self.futures

        prediction_markets = self.prediction_markets


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if spot is not UNSET:
            field_dict["spot"] = spot
        if futures is not UNSET:
            field_dict["futures"] = futures
        if prediction_markets is not UNSET:
            field_dict["predictionMarkets"] = prediction_markets

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        spot = d.pop("spot", UNSET)

        futures = d.pop("futures", UNSET)

        prediction_markets = d.pop("predictionMarkets", UNSET)

        agent_execution_assumptions_cost_model = cls(
            spot=spot,
            futures=futures,
            prediction_markets=prediction_markets,
        )


        agent_execution_assumptions_cost_model.additional_properties = d
        return agent_execution_assumptions_cost_model

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
