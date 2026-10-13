from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.pm_paper_v2_position import PmPaperV2Position
    from ..models.pm_paper_v2_positions_response_configured_house_type_0 import (
        PmPaperV2PositionsResponseConfiguredHouseType0,
    )
    from ..models.pm_paper_v2_risk import PmPaperV2Risk


T = TypeVar("T", bound="PmPaperV2PositionsResponse")


@_attrs_define
class PmPaperV2PositionsResponse:
    """
    Attributes:
        execution_model (Literal['pm_paper_v2']):
        positions (list[PmPaperV2Position]):
        has_more (bool):
        next_before_id (int | None):
        risk (PmPaperV2Risk): Unpaginated exact totals for the calling key's v2 positions; "today" is the UTC day.
        configured_house (None | PmPaperV2PositionsResponseConfiguredHouseType0): This key's house enrollment; null when
            the key is not an enrolled house agent.
        entry_enabled (bool): True when this key is enrolled and v2 entry is switched on.
    """

    execution_model: Literal["pm_paper_v2"]
    positions: list[PmPaperV2Position]
    has_more: bool
    next_before_id: int | None
    risk: PmPaperV2Risk
    configured_house: None | PmPaperV2PositionsResponseConfiguredHouseType0
    entry_enabled: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.pm_paper_v2_positions_response_configured_house_type_0 import (
            PmPaperV2PositionsResponseConfiguredHouseType0,
        )

        execution_model = self.execution_model

        positions = []
        for positions_item_data in self.positions:
            positions_item = positions_item_data.to_dict()
            positions.append(positions_item)

        has_more = self.has_more

        next_before_id: int | None
        next_before_id = self.next_before_id

        risk = self.risk.to_dict()

        configured_house: dict[str, Any] | None
        if isinstance(self.configured_house, PmPaperV2PositionsResponseConfiguredHouseType0):
            configured_house = self.configured_house.to_dict()
        else:
            configured_house = self.configured_house

        entry_enabled = self.entry_enabled

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "executionModel": execution_model,
                "positions": positions,
                "hasMore": has_more,
                "nextBeforeId": next_before_id,
                "risk": risk,
                "configuredHouse": configured_house,
                "entryEnabled": entry_enabled,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.pm_paper_v2_position import PmPaperV2Position
        from ..models.pm_paper_v2_positions_response_configured_house_type_0 import (
            PmPaperV2PositionsResponseConfiguredHouseType0,
        )
        from ..models.pm_paper_v2_risk import PmPaperV2Risk

        d = dict(src_dict)
        execution_model = cast(Literal["pm_paper_v2"], d.pop("executionModel"))
        if execution_model != "pm_paper_v2":
            raise ValueError(f"executionModel must match const 'pm_paper_v2', got '{execution_model}'")

        positions = []
        _positions = d.pop("positions")
        for positions_item_data in _positions:
            positions_item = PmPaperV2Position.from_dict(positions_item_data)

            positions.append(positions_item)

        has_more = d.pop("hasMore")

        def _parse_next_before_id(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        next_before_id = _parse_next_before_id(d.pop("nextBeforeId"))

        risk = PmPaperV2Risk.from_dict(d.pop("risk"))

        def _parse_configured_house(data: object) -> None | PmPaperV2PositionsResponseConfiguredHouseType0:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                configured_house_type_0 = PmPaperV2PositionsResponseConfiguredHouseType0.from_dict(data)

                return configured_house_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PmPaperV2PositionsResponseConfiguredHouseType0, data)

        configured_house = _parse_configured_house(d.pop("configuredHouse"))

        entry_enabled = d.pop("entryEnabled")

        pm_paper_v2_positions_response = cls(
            execution_model=execution_model,
            positions=positions,
            has_more=has_more,
            next_before_id=next_before_id,
            risk=risk,
            configured_house=configured_house,
            entry_enabled=entry_enabled,
        )

        pm_paper_v2_positions_response.additional_properties = d
        return pm_paper_v2_positions_response

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
