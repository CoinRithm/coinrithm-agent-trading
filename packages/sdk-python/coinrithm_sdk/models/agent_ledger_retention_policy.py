from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="AgentLedgerRetentionPolicy")


@_attrs_define
class AgentLedgerRetentionPolicy:
    """Bounded retention/cap policy for private agent ledger evidence.

    Attributes:
        schema (str | Unset):
        retention_days (int | Unset): Rolling private ledger retention window.
        run_list_scan_limit (int | Unset): Max recent ledger rows scanned to build the settings run list.
        export_max_rows (int | Unset): Max rows included in one ledger/run export.
        prune_batch_max (int | Unset): Max rows deleted by one retention prune run.
        policy (str | Unset):
    """

    schema: str | Unset = UNSET
    retention_days: int | Unset = UNSET
    run_list_scan_limit: int | Unset = UNSET
    export_max_rows: int | Unset = UNSET
    prune_batch_max: int | Unset = UNSET
    policy: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        schema = self.schema

        retention_days = self.retention_days

        run_list_scan_limit = self.run_list_scan_limit

        export_max_rows = self.export_max_rows

        prune_batch_max = self.prune_batch_max

        policy = self.policy

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if schema is not UNSET:
            field_dict["schema"] = schema
        if retention_days is not UNSET:
            field_dict["retentionDays"] = retention_days
        if run_list_scan_limit is not UNSET:
            field_dict["runListScanLimit"] = run_list_scan_limit
        if export_max_rows is not UNSET:
            field_dict["exportMaxRows"] = export_max_rows
        if prune_batch_max is not UNSET:
            field_dict["pruneBatchMax"] = prune_batch_max
        if policy is not UNSET:
            field_dict["policy"] = policy

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        schema = d.pop("schema", UNSET)

        retention_days = d.pop("retentionDays", UNSET)

        run_list_scan_limit = d.pop("runListScanLimit", UNSET)

        export_max_rows = d.pop("exportMaxRows", UNSET)

        prune_batch_max = d.pop("pruneBatchMax", UNSET)

        policy = d.pop("policy", UNSET)

        agent_ledger_retention_policy = cls(
            schema=schema,
            retention_days=retention_days,
            run_list_scan_limit=run_list_scan_limit,
            export_max_rows=export_max_rows,
            prune_batch_max=prune_batch_max,
            policy=policy,
        )

        agent_ledger_retention_policy.additional_properties = d
        return agent_ledger_retention_policy

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
