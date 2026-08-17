from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_run_count import AgentRunCount
    from ..models.agent_run_evidence_manifest_summary_related_entities_item import (
        AgentRunEvidenceManifestSummaryRelatedEntitiesItem,
    )


T = TypeVar("T", bound="AgentRunEvidenceManifestSummary")


@_attrs_define
class AgentRunEvidenceManifestSummary:
    """
    Attributes:
        api_key_id (int | Unset):
        run_id (str | Unset):
        event_count (int | Unset):
        first_event_at (datetime.datetime | None | Unset):
        last_event_at (datetime.datetime | None | Unset):
        quote_count (int | Unset):
        write_count (int | Unset):
        rejection_count (int | Unset):
        idempotent_replay_count (int | Unset):
        observation_count (int | Unset):
        observation_coverage_rate (float | None | Unset):
        quote_before_trade_rate (float | None | Unset):
        average_latency_ms (float | None | Unset):
        event_types (list[AgentRunCount] | Unset):
        venues (list[AgentRunCount] | Unset):
        ledger_statuses (list[AgentRunCount] | Unset):
        related_entities (list[AgentRunEvidenceManifestSummaryRelatedEntitiesItem] | Unset):
        max_rows (int | None | Unset):
        truncated (bool | Unset):
    """

    api_key_id: int | Unset = UNSET
    run_id: str | Unset = UNSET
    event_count: int | Unset = UNSET
    first_event_at: datetime.datetime | None | Unset = UNSET
    last_event_at: datetime.datetime | None | Unset = UNSET
    quote_count: int | Unset = UNSET
    write_count: int | Unset = UNSET
    rejection_count: int | Unset = UNSET
    idempotent_replay_count: int | Unset = UNSET
    observation_count: int | Unset = UNSET
    observation_coverage_rate: float | None | Unset = UNSET
    quote_before_trade_rate: float | None | Unset = UNSET
    average_latency_ms: float | None | Unset = UNSET
    event_types: list[AgentRunCount] | Unset = UNSET
    venues: list[AgentRunCount] | Unset = UNSET
    ledger_statuses: list[AgentRunCount] | Unset = UNSET
    related_entities: list[AgentRunEvidenceManifestSummaryRelatedEntitiesItem] | Unset = UNSET
    max_rows: int | None | Unset = UNSET
    truncated: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        api_key_id = self.api_key_id

        run_id = self.run_id

        event_count = self.event_count

        first_event_at: None | str | Unset
        if isinstance(self.first_event_at, Unset):
            first_event_at = UNSET
        elif isinstance(self.first_event_at, datetime.datetime):
            first_event_at = self.first_event_at.isoformat()
        else:
            first_event_at = self.first_event_at

        last_event_at: None | str | Unset
        if isinstance(self.last_event_at, Unset):
            last_event_at = UNSET
        elif isinstance(self.last_event_at, datetime.datetime):
            last_event_at = self.last_event_at.isoformat()
        else:
            last_event_at = self.last_event_at

        quote_count = self.quote_count

        write_count = self.write_count

        rejection_count = self.rejection_count

        idempotent_replay_count = self.idempotent_replay_count

        observation_count = self.observation_count

        observation_coverage_rate: float | None | Unset
        if isinstance(self.observation_coverage_rate, Unset):
            observation_coverage_rate = UNSET
        else:
            observation_coverage_rate = self.observation_coverage_rate

        quote_before_trade_rate: float | None | Unset
        if isinstance(self.quote_before_trade_rate, Unset):
            quote_before_trade_rate = UNSET
        else:
            quote_before_trade_rate = self.quote_before_trade_rate

        average_latency_ms: float | None | Unset
        if isinstance(self.average_latency_ms, Unset):
            average_latency_ms = UNSET
        else:
            average_latency_ms = self.average_latency_ms

        event_types: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.event_types, Unset):
            event_types = []
            for event_types_item_data in self.event_types:
                event_types_item = event_types_item_data.to_dict()
                event_types.append(event_types_item)

        venues: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.venues, Unset):
            venues = []
            for venues_item_data in self.venues:
                venues_item = venues_item_data.to_dict()
                venues.append(venues_item)

        ledger_statuses: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.ledger_statuses, Unset):
            ledger_statuses = []
            for ledger_statuses_item_data in self.ledger_statuses:
                ledger_statuses_item = ledger_statuses_item_data.to_dict()
                ledger_statuses.append(ledger_statuses_item)

        related_entities: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.related_entities, Unset):
            related_entities = []
            for related_entities_item_data in self.related_entities:
                related_entities_item = related_entities_item_data.to_dict()
                related_entities.append(related_entities_item)

        max_rows: int | None | Unset
        if isinstance(self.max_rows, Unset):
            max_rows = UNSET
        else:
            max_rows = self.max_rows

        truncated = self.truncated

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if api_key_id is not UNSET:
            field_dict["apiKeyId"] = api_key_id
        if run_id is not UNSET:
            field_dict["runId"] = run_id
        if event_count is not UNSET:
            field_dict["eventCount"] = event_count
        if first_event_at is not UNSET:
            field_dict["firstEventAt"] = first_event_at
        if last_event_at is not UNSET:
            field_dict["lastEventAt"] = last_event_at
        if quote_count is not UNSET:
            field_dict["quoteCount"] = quote_count
        if write_count is not UNSET:
            field_dict["writeCount"] = write_count
        if rejection_count is not UNSET:
            field_dict["rejectionCount"] = rejection_count
        if idempotent_replay_count is not UNSET:
            field_dict["idempotentReplayCount"] = idempotent_replay_count
        if observation_count is not UNSET:
            field_dict["observationCount"] = observation_count
        if observation_coverage_rate is not UNSET:
            field_dict["observationCoverageRate"] = observation_coverage_rate
        if quote_before_trade_rate is not UNSET:
            field_dict["quoteBeforeTradeRate"] = quote_before_trade_rate
        if average_latency_ms is not UNSET:
            field_dict["averageLatencyMs"] = average_latency_ms
        if event_types is not UNSET:
            field_dict["eventTypes"] = event_types
        if venues is not UNSET:
            field_dict["venues"] = venues
        if ledger_statuses is not UNSET:
            field_dict["ledgerStatuses"] = ledger_statuses
        if related_entities is not UNSET:
            field_dict["relatedEntities"] = related_entities
        if max_rows is not UNSET:
            field_dict["maxRows"] = max_rows
        if truncated is not UNSET:
            field_dict["truncated"] = truncated

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_run_count import AgentRunCount
        from ..models.agent_run_evidence_manifest_summary_related_entities_item import (
            AgentRunEvidenceManifestSummaryRelatedEntitiesItem,
        )

        d = dict(src_dict)
        api_key_id = d.pop("apiKeyId", UNSET)

        run_id = d.pop("runId", UNSET)

        event_count = d.pop("eventCount", UNSET)

        def _parse_first_event_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                first_event_at_type_0 = datetime.datetime.fromisoformat(data)

                return first_event_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        first_event_at = _parse_first_event_at(d.pop("firstEventAt", UNSET))

        def _parse_last_event_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                last_event_at_type_0 = datetime.datetime.fromisoformat(data)

                return last_event_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        last_event_at = _parse_last_event_at(d.pop("lastEventAt", UNSET))

        quote_count = d.pop("quoteCount", UNSET)

        write_count = d.pop("writeCount", UNSET)

        rejection_count = d.pop("rejectionCount", UNSET)

        idempotent_replay_count = d.pop("idempotentReplayCount", UNSET)

        observation_count = d.pop("observationCount", UNSET)

        def _parse_observation_coverage_rate(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        observation_coverage_rate = _parse_observation_coverage_rate(d.pop("observationCoverageRate", UNSET))

        def _parse_quote_before_trade_rate(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        quote_before_trade_rate = _parse_quote_before_trade_rate(d.pop("quoteBeforeTradeRate", UNSET))

        def _parse_average_latency_ms(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        average_latency_ms = _parse_average_latency_ms(d.pop("averageLatencyMs", UNSET))

        _event_types = d.pop("eventTypes", UNSET)
        event_types: list[AgentRunCount] | Unset = UNSET
        if _event_types is not UNSET:
            event_types = []
            for event_types_item_data in _event_types:
                event_types_item = AgentRunCount.from_dict(event_types_item_data)

                event_types.append(event_types_item)

        _venues = d.pop("venues", UNSET)
        venues: list[AgentRunCount] | Unset = UNSET
        if _venues is not UNSET:
            venues = []
            for venues_item_data in _venues:
                venues_item = AgentRunCount.from_dict(venues_item_data)

                venues.append(venues_item)

        _ledger_statuses = d.pop("ledgerStatuses", UNSET)
        ledger_statuses: list[AgentRunCount] | Unset = UNSET
        if _ledger_statuses is not UNSET:
            ledger_statuses = []
            for ledger_statuses_item_data in _ledger_statuses:
                ledger_statuses_item = AgentRunCount.from_dict(ledger_statuses_item_data)

                ledger_statuses.append(ledger_statuses_item)

        _related_entities = d.pop("relatedEntities", UNSET)
        related_entities: list[AgentRunEvidenceManifestSummaryRelatedEntitiesItem] | Unset = UNSET
        if _related_entities is not UNSET:
            related_entities = []
            for related_entities_item_data in _related_entities:
                related_entities_item = AgentRunEvidenceManifestSummaryRelatedEntitiesItem.from_dict(
                    related_entities_item_data
                )

                related_entities.append(related_entities_item)

        def _parse_max_rows(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        max_rows = _parse_max_rows(d.pop("maxRows", UNSET))

        truncated = d.pop("truncated", UNSET)

        agent_run_evidence_manifest_summary = cls(
            api_key_id=api_key_id,
            run_id=run_id,
            event_count=event_count,
            first_event_at=first_event_at,
            last_event_at=last_event_at,
            quote_count=quote_count,
            write_count=write_count,
            rejection_count=rejection_count,
            idempotent_replay_count=idempotent_replay_count,
            observation_count=observation_count,
            observation_coverage_rate=observation_coverage_rate,
            quote_before_trade_rate=quote_before_trade_rate,
            average_latency_ms=average_latency_ms,
            event_types=event_types,
            venues=venues,
            ledger_statuses=ledger_statuses,
            related_entities=related_entities,
            max_rows=max_rows,
            truncated=truncated,
        )

        agent_run_evidence_manifest_summary.additional_properties = d
        return agent_run_evidence_manifest_summary

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
