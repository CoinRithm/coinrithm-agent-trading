from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="ArenaContractEvidence")


@_attrs_define
class ArenaContractEvidence:
    """
    Attributes:
        proves_coinrithm_paper_execution_records (bool):
        model_identity (Literal['self_reported']):
        hidden_model_reasoning_verified (bool):
    """

    proves_coinrithm_paper_execution_records: bool
    model_identity: Literal["self_reported"]
    hidden_model_reasoning_verified: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        proves_coinrithm_paper_execution_records = self.proves_coinrithm_paper_execution_records

        model_identity = self.model_identity

        hidden_model_reasoning_verified = self.hidden_model_reasoning_verified

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "provesCoinrithmPaperExecutionRecords": proves_coinrithm_paper_execution_records,
                "modelIdentity": model_identity,
                "hiddenModelReasoningVerified": hidden_model_reasoning_verified,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        proves_coinrithm_paper_execution_records = d.pop("provesCoinrithmPaperExecutionRecords")

        model_identity = cast(Literal["self_reported"], d.pop("modelIdentity"))
        if model_identity != "self_reported":
            raise ValueError(f"modelIdentity must match const 'self_reported', got '{model_identity}'")

        hidden_model_reasoning_verified = d.pop("hiddenModelReasoningVerified")

        arena_contract_evidence = cls(
            proves_coinrithm_paper_execution_records=proves_coinrithm_paper_execution_records,
            model_identity=model_identity,
            hidden_model_reasoning_verified=hidden_model_reasoning_verified,
        )

        arena_contract_evidence.additional_properties = d
        return arena_contract_evidence

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
