from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.agent_universe_sector import AgentUniverseSector


T = TypeVar("T", bound="AgentUniverseSectorsResponse")


@_attrs_define
class AgentUniverseSectorsResponse:
    """
    Attributes:
        sectors (list[AgentUniverseSector]):
    """

    sectors: list[AgentUniverseSector]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        sectors = []
        for sectors_item_data in self.sectors:
            sectors_item = sectors_item_data.to_dict()
            sectors.append(sectors_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "sectors": sectors,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_universe_sector import AgentUniverseSector

        d = dict(src_dict)
        sectors = []
        _sectors = d.pop("sectors")
        for sectors_item_data in _sectors:
            sectors_item = AgentUniverseSector.from_dict(sectors_item_data)

            sectors.append(sectors_item)

        agent_universe_sectors_response = cls(
            sectors=sectors,
        )

        agent_universe_sectors_response.additional_properties = d
        return agent_universe_sectors_response

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
