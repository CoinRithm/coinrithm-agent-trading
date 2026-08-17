from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_observation import AgentObservation
    from ..models.pm_discovery_market import PmDiscoveryMarket
    from ..models.pm_discovery_response_meta import PmDiscoveryResponseMeta
    from ..models.pm_discovery_response_pagination import PmDiscoveryResponsePagination


T = TypeVar("T", bound="PmDiscoveryResponse")


@_attrs_define
class PmDiscoveryResponse:
    """
    Attributes:
        data (list[PmDiscoveryMarket] | Unset):
        pagination (PmDiscoveryResponsePagination | Unset):
        meta (PmDiscoveryResponseMeta | Unset):
        observation (AgentObservation | Unset): Compact provenance block for an agent-facing market observation. It is
            also stored in the private ledger responseSummary when the request uses
            agentTrace/run headers, giving run exports a verifiable snapshot of what
            the agent observed without creating a full market archive.
    """

    data: list[PmDiscoveryMarket] | Unset = UNSET
    pagination: PmDiscoveryResponsePagination | Unset = UNSET
    meta: PmDiscoveryResponseMeta | Unset = UNSET
    observation: AgentObservation | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        data: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.data, Unset):
            data = []
            for data_item_data in self.data:
                data_item = data_item_data.to_dict()
                data.append(data_item)

        pagination: dict[str, Any] | Unset = UNSET
        if not isinstance(self.pagination, Unset):
            pagination = self.pagination.to_dict()

        meta: dict[str, Any] | Unset = UNSET
        if not isinstance(self.meta, Unset):
            meta = self.meta.to_dict()

        observation: dict[str, Any] | Unset = UNSET
        if not isinstance(self.observation, Unset):
            observation = self.observation.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if data is not UNSET:
            field_dict["data"] = data
        if pagination is not UNSET:
            field_dict["pagination"] = pagination
        if meta is not UNSET:
            field_dict["meta"] = meta
        if observation is not UNSET:
            field_dict["observation"] = observation

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_observation import AgentObservation
        from ..models.pm_discovery_market import PmDiscoveryMarket
        from ..models.pm_discovery_response_meta import PmDiscoveryResponseMeta
        from ..models.pm_discovery_response_pagination import PmDiscoveryResponsePagination

        d = dict(src_dict)
        _data = d.pop("data", UNSET)
        data: list[PmDiscoveryMarket] | Unset = UNSET
        if _data is not UNSET:
            data = []
            for data_item_data in _data:
                data_item = PmDiscoveryMarket.from_dict(data_item_data)

                data.append(data_item)

        _pagination = d.pop("pagination", UNSET)
        pagination: PmDiscoveryResponsePagination | Unset
        if isinstance(_pagination, Unset):
            pagination = UNSET
        else:
            pagination = PmDiscoveryResponsePagination.from_dict(_pagination)

        _meta = d.pop("meta", UNSET)
        meta: PmDiscoveryResponseMeta | Unset
        if isinstance(_meta, Unset):
            meta = UNSET
        else:
            meta = PmDiscoveryResponseMeta.from_dict(_meta)

        _observation = d.pop("observation", UNSET)
        observation: AgentObservation | Unset
        if isinstance(_observation, Unset):
            observation = UNSET
        else:
            observation = AgentObservation.from_dict(_observation)

        pm_discovery_response = cls(
            data=data,
            pagination=pagination,
            meta=meta,
            observation=observation,
        )

        pm_discovery_response.additional_properties = d
        return pm_discovery_response

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
