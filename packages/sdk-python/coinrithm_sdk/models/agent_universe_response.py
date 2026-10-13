from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.agent_observation import AgentObservation
    from ..models.agent_universe_row import AgentUniverseRow


T = TypeVar("T", bound="AgentUniverseResponse")


@_attrs_define
class AgentUniverseResponse:
    """
    Attributes:
        rows (list[AgentUniverseRow]):
        observation (AgentObservation): Compact provenance block for an agent-facing market observation. It is
            also stored in the private ledger responseSummary when the request uses
            agentTrace/run headers, giving run exports a verifiable snapshot of what
            the agent observed without creating a full market archive.
    """

    rows: list[AgentUniverseRow]
    observation: AgentObservation
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        rows = []
        for rows_item_data in self.rows:
            rows_item = rows_item_data.to_dict()
            rows.append(rows_item)

        observation = self.observation.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "rows": rows,
                "observation": observation,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_observation import AgentObservation
        from ..models.agent_universe_row import AgentUniverseRow

        d = dict(src_dict)
        rows = []
        _rows = d.pop("rows")
        for rows_item_data in _rows:
            rows_item = AgentUniverseRow.from_dict(rows_item_data)

            rows.append(rows_item)

        observation = AgentObservation.from_dict(d.pop("observation"))

        agent_universe_response = cls(
            rows=rows,
            observation=observation,
        )

        agent_universe_response.additional_properties = d
        return agent_universe_response

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
