from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_action_event import AgentActionEvent
    from ..models.agent_run_evidence_manifest import AgentRunEvidenceManifest


T = TypeVar("T", bound="AgentLedgerExport")


@_attrs_define
class AgentLedgerExport:
    """
    Attributes:
        api_key_id (int | Unset):
        exported_at (datetime.datetime | Unset):
        count (int | Unset):
        max_rows (int | Unset):
        run (AgentRunEvidenceManifest | None | Unset): Present when exporting with a runId filter.
        data (list[AgentActionEvent] | Unset):
    """

    api_key_id: int | Unset = UNSET
    exported_at: datetime.datetime | Unset = UNSET
    count: int | Unset = UNSET
    max_rows: int | Unset = UNSET
    run: AgentRunEvidenceManifest | None | Unset = UNSET
    data: list[AgentActionEvent] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.agent_run_evidence_manifest import AgentRunEvidenceManifest

        api_key_id = self.api_key_id

        exported_at: str | Unset = UNSET
        if not isinstance(self.exported_at, Unset):
            exported_at = self.exported_at.isoformat()

        count = self.count

        max_rows = self.max_rows

        run: dict[str, Any] | None | Unset
        if isinstance(self.run, Unset):
            run = UNSET
        elif isinstance(self.run, AgentRunEvidenceManifest):
            run = self.run.to_dict()
        else:
            run = self.run

        data: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.data, Unset):
            data = []
            for data_item_data in self.data:
                data_item = data_item_data.to_dict()
                data.append(data_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if api_key_id is not UNSET:
            field_dict["apiKeyId"] = api_key_id
        if exported_at is not UNSET:
            field_dict["exportedAt"] = exported_at
        if count is not UNSET:
            field_dict["count"] = count
        if max_rows is not UNSET:
            field_dict["maxRows"] = max_rows
        if run is not UNSET:
            field_dict["run"] = run
        if data is not UNSET:
            field_dict["data"] = data

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_action_event import AgentActionEvent
        from ..models.agent_run_evidence_manifest import AgentRunEvidenceManifest

        d = dict(src_dict)
        api_key_id = d.pop("apiKeyId", UNSET)

        _exported_at = d.pop("exportedAt", UNSET)
        exported_at: datetime.datetime | Unset
        if isinstance(_exported_at, Unset):
            exported_at = UNSET
        else:
            exported_at = datetime.datetime.fromisoformat(_exported_at)

        count = d.pop("count", UNSET)

        max_rows = d.pop("maxRows", UNSET)

        def _parse_run(data: object) -> AgentRunEvidenceManifest | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                run_type_0 = AgentRunEvidenceManifest.from_dict(data)

                return run_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(AgentRunEvidenceManifest | None | Unset, data)

        run = _parse_run(d.pop("run", UNSET))

        _data = d.pop("data", UNSET)
        data: list[AgentActionEvent] | Unset = UNSET
        if _data is not UNSET:
            data = []
            for data_item_data in _data:
                data_item = AgentActionEvent.from_dict(data_item_data)

                data.append(data_item)

        agent_ledger_export = cls(
            api_key_id=api_key_id,
            exported_at=exported_at,
            count=count,
            max_rows=max_rows,
            run=run,
            data=data,
        )

        agent_ledger_export.additional_properties = d
        return agent_ledger_export

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
