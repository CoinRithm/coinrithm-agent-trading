from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_observation_dataset import AgentObservationDataset
    from ..models.agent_observation_inputs import AgentObservationInputs
    from ..models.freshness import Freshness


T = TypeVar("T", bound="AgentObservation")


@_attrs_define
class AgentObservation:
    """Compact provenance block for an agent-facing market observation. It is
    also stored in the private ledger responseSummary when the request uses
    agentTrace/run headers, giving run exports a verifiable snapshot of what
    the agent observed without creating a full market archive.

        Attributes:
            schema (str | Unset):
            endpoint (str | Unset):
            source (str | Unset):
            observed_at (datetime.datetime | Unset):
            source_as_of (datetime.datetime | None | Unset):
            freshness (Freshness | None | Unset):
            inputs (AgentObservationInputs | Unset):
            dataset (AgentObservationDataset | Unset):
            row_count (int | None | Unset):
            hash_ (str | Unset): Short SHA-256 digest of the observed payload metadata.
    """

    schema: str | Unset = UNSET
    endpoint: str | Unset = UNSET
    source: str | Unset = UNSET
    observed_at: datetime.datetime | Unset = UNSET
    source_as_of: datetime.datetime | None | Unset = UNSET
    freshness: Freshness | None | Unset = UNSET
    inputs: AgentObservationInputs | Unset = UNSET
    dataset: AgentObservationDataset | Unset = UNSET
    row_count: int | None | Unset = UNSET
    hash_: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.freshness import Freshness

        schema = self.schema

        endpoint = self.endpoint

        source = self.source

        observed_at: str | Unset = UNSET
        if not isinstance(self.observed_at, Unset):
            observed_at = self.observed_at.isoformat()

        source_as_of: None | str | Unset
        if isinstance(self.source_as_of, Unset):
            source_as_of = UNSET
        elif isinstance(self.source_as_of, datetime.datetime):
            source_as_of = self.source_as_of.isoformat()
        else:
            source_as_of = self.source_as_of

        freshness: dict[str, Any] | None | Unset
        if isinstance(self.freshness, Unset):
            freshness = UNSET
        elif isinstance(self.freshness, Freshness):
            freshness = self.freshness.to_dict()
        else:
            freshness = self.freshness

        inputs: dict[str, Any] | Unset = UNSET
        if not isinstance(self.inputs, Unset):
            inputs = self.inputs.to_dict()

        dataset: dict[str, Any] | Unset = UNSET
        if not isinstance(self.dataset, Unset):
            dataset = self.dataset.to_dict()

        row_count: int | None | Unset
        if isinstance(self.row_count, Unset):
            row_count = UNSET
        else:
            row_count = self.row_count

        hash_ = self.hash_

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if schema is not UNSET:
            field_dict["schema"] = schema
        if endpoint is not UNSET:
            field_dict["endpoint"] = endpoint
        if source is not UNSET:
            field_dict["source"] = source
        if observed_at is not UNSET:
            field_dict["observedAt"] = observed_at
        if source_as_of is not UNSET:
            field_dict["sourceAsOf"] = source_as_of
        if freshness is not UNSET:
            field_dict["freshness"] = freshness
        if inputs is not UNSET:
            field_dict["inputs"] = inputs
        if dataset is not UNSET:
            field_dict["dataset"] = dataset
        if row_count is not UNSET:
            field_dict["rowCount"] = row_count
        if hash_ is not UNSET:
            field_dict["hash"] = hash_

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_observation_dataset import AgentObservationDataset
        from ..models.agent_observation_inputs import AgentObservationInputs
        from ..models.freshness import Freshness

        d = dict(src_dict)
        schema = d.pop("schema", UNSET)

        endpoint = d.pop("endpoint", UNSET)

        source = d.pop("source", UNSET)

        _observed_at = d.pop("observedAt", UNSET)
        observed_at: datetime.datetime | Unset
        if isinstance(_observed_at, Unset):
            observed_at = UNSET
        else:
            observed_at = datetime.datetime.fromisoformat(_observed_at)

        def _parse_source_as_of(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                source_as_of_type_0 = datetime.datetime.fromisoformat(data)

                return source_as_of_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        source_as_of = _parse_source_as_of(d.pop("sourceAsOf", UNSET))

        def _parse_freshness(data: object) -> Freshness | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                freshness_type_0 = Freshness.from_dict(data)

                return freshness_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(Freshness | None | Unset, data)

        freshness = _parse_freshness(d.pop("freshness", UNSET))

        _inputs = d.pop("inputs", UNSET)
        inputs: AgentObservationInputs | Unset
        if isinstance(_inputs, Unset):
            inputs = UNSET
        else:
            inputs = AgentObservationInputs.from_dict(_inputs)

        _dataset = d.pop("dataset", UNSET)
        dataset: AgentObservationDataset | Unset
        if isinstance(_dataset, Unset):
            dataset = UNSET
        else:
            dataset = AgentObservationDataset.from_dict(_dataset)

        def _parse_row_count(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        row_count = _parse_row_count(d.pop("rowCount", UNSET))

        hash_ = d.pop("hash", UNSET)

        agent_observation = cls(
            schema=schema,
            endpoint=endpoint,
            source=source,
            observed_at=observed_at,
            source_as_of=source_as_of,
            freshness=freshness,
            inputs=inputs,
            dataset=dataset,
            row_count=row_count,
            hash_=hash_,
        )

        agent_observation.additional_properties = d
        return agent_observation

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
