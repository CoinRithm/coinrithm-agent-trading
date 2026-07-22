from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.freshness_basis import FreshnessBasis
from ..models.freshness_status_type_1 import FreshnessStatusType1
from ..models.freshness_status_type_2_type_1 import FreshnessStatusType2Type1
from ..models.freshness_status_type_3_type_1 import FreshnessStatusType3Type1
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime






T = TypeVar("T", bound="Freshness")



@_attrs_define
class Freshness:
    """ Data-freshness descriptor. Futures + spot use ageSeconds; PM uses
    ageMinutes. `status` is a freshness label; `basis` (PM only) names which
    timestamp the age was measured against.

        Attributes:
            as_of (datetime.datetime | None | Unset):
            age_seconds (float | None | Unset): futures / spot
            age_minutes (float | None | Unset): PM
            status (FreshnessStatusType1 | FreshnessStatusType2Type1 | FreshnessStatusType3Type1 | None | Unset): fresh |
                lagging (PM only) | stale | unknown. PM lagging>=45m &
                stale>=2h; spot/futures stale>120s.
            basis (FreshnessBasis | Unset): PM only — which timestamp the age was measured against.
     """

    as_of: datetime.datetime | None | Unset = UNSET
    age_seconds: float | None | Unset = UNSET
    age_minutes: float | None | Unset = UNSET
    status: FreshnessStatusType1 | FreshnessStatusType2Type1 | FreshnessStatusType3Type1 | None | Unset = UNSET
    basis: FreshnessBasis | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        as_of: None | str | Unset
        if isinstance(self.as_of, Unset):
            as_of = UNSET
        elif isinstance(self.as_of, datetime.datetime):
            as_of = self.as_of.isoformat()
        else:
            as_of = self.as_of

        age_seconds: float | None | Unset
        if isinstance(self.age_seconds, Unset):
            age_seconds = UNSET
        else:
            age_seconds = self.age_seconds

        age_minutes: float | None | Unset
        if isinstance(self.age_minutes, Unset):
            age_minutes = UNSET
        else:
            age_minutes = self.age_minutes

        status: None | str | Unset
        if isinstance(self.status, Unset):
            status = UNSET
        elif isinstance(self.status, FreshnessStatusType1):
            status = self.status.value
        elif isinstance(self.status, FreshnessStatusType2Type1):
            status = self.status.value
        elif isinstance(self.status, FreshnessStatusType3Type1):
            status = self.status.value
        else:
            status = self.status

        basis: str | Unset = UNSET
        if not isinstance(self.basis, Unset):
            basis = self.basis.value



        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if as_of is not UNSET:
            field_dict["asOf"] = as_of
        if age_seconds is not UNSET:
            field_dict["ageSeconds"] = age_seconds
        if age_minutes is not UNSET:
            field_dict["ageMinutes"] = age_minutes
        if status is not UNSET:
            field_dict["status"] = status
        if basis is not UNSET:
            field_dict["basis"] = basis

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        def _parse_as_of(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                as_of_type_0 = isoparse(data)



                return as_of_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        as_of = _parse_as_of(d.pop("asOf", UNSET))


        def _parse_age_seconds(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        age_seconds = _parse_age_seconds(d.pop("ageSeconds", UNSET))


        def _parse_age_minutes(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        age_minutes = _parse_age_minutes(d.pop("ageMinutes", UNSET))


        def _parse_status(data: object) -> FreshnessStatusType1 | FreshnessStatusType2Type1 | FreshnessStatusType3Type1 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                status_type_1 = FreshnessStatusType1(data)



                return status_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                status_type_2_type_1 = FreshnessStatusType2Type1(data)



                return status_type_2_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                status_type_3_type_1 = FreshnessStatusType3Type1(data)



                return status_type_3_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(FreshnessStatusType1 | FreshnessStatusType2Type1 | FreshnessStatusType3Type1 | None | Unset, data)

        status = _parse_status(d.pop("status", UNSET))


        _basis = d.pop("basis", UNSET)
        basis: FreshnessBasis | Unset
        if isinstance(_basis,  Unset):
            basis = UNSET
        else:
            basis = FreshnessBasis(_basis)




        freshness = cls(
            as_of=as_of,
            age_seconds=age_seconds,
            age_minutes=age_minutes,
            status=status,
            basis=basis,
        )


        freshness.additional_properties = d
        return freshness

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
