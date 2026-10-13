from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_universe_validation_error_details_item import AgentUniverseValidationErrorDetailsItem


T = TypeVar("T", bound="AgentUniverseValidationError")


@_attrs_define
class AgentUniverseValidationError:
    """
    Attributes:
        error (str):
        details (list[AgentUniverseValidationErrorDetailsItem] | Unset): Validation issues (path, message);
            informational.
    """

    error: str
    details: list[AgentUniverseValidationErrorDetailsItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        error = self.error

        details: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.details, Unset):
            details = []
            for details_item_data in self.details:
                details_item = details_item_data.to_dict()
                details.append(details_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "error": error,
            }
        )
        if details is not UNSET:
            field_dict["details"] = details

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_universe_validation_error_details_item import AgentUniverseValidationErrorDetailsItem

        d = dict(src_dict)
        error = d.pop("error")

        _details = d.pop("details", UNSET)
        details: list[AgentUniverseValidationErrorDetailsItem] | Unset = UNSET
        if _details is not UNSET:
            details = []
            for details_item_data in _details:
                details_item = AgentUniverseValidationErrorDetailsItem.from_dict(details_item_data)

                details.append(details_item)

        agent_universe_validation_error = cls(
            error=error,
            details=details,
        )

        agent_universe_validation_error.additional_properties = d
        return agent_universe_validation_error

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
