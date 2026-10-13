from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="GetPmPaperV2PositionsResponse503")


@_attrs_define
class GetPmPaperV2PositionsResponse503:
    """
    Attributes:
        execution_model (Literal['pm_paper_v2']):
        error (str):
    """

    execution_model: Literal["pm_paper_v2"]
    error: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        execution_model = self.execution_model

        error = self.error

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "executionModel": execution_model,
                "error": error,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        execution_model = cast(Literal["pm_paper_v2"], d.pop("executionModel"))
        if execution_model != "pm_paper_v2":
            raise ValueError(f"executionModel must match const 'pm_paper_v2', got '{execution_model}'")

        error = d.pop("error")

        get_pm_paper_v2_positions_response_503 = cls(
            execution_model=execution_model,
            error=error,
        )

        get_pm_paper_v2_positions_response_503.additional_properties = d
        return get_pm_paper_v2_positions_response_503

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
