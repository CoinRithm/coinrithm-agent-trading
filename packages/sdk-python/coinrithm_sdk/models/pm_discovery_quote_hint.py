from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_discovery_quote_hint_source import PmDiscoveryQuoteHintSource
from ..types import UNSET, Unset

T = TypeVar("T", bound="PmDiscoveryQuoteHint")


@_attrs_define
class PmDiscoveryQuoteHint:
    """
    Attributes:
        endpoint (str | Unset):
        source (PmDiscoveryQuoteHintSource | Unset):
        slug (str | Unset):
        stake_musd_min (float | Unset):
        outcome_external_market_id_field (str | Unset):
    """

    endpoint: str | Unset = UNSET
    source: PmDiscoveryQuoteHintSource | Unset = UNSET
    slug: str | Unset = UNSET
    stake_musd_min: float | Unset = UNSET
    outcome_external_market_id_field: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        endpoint = self.endpoint

        source: str | Unset = UNSET
        if not isinstance(self.source, Unset):
            source = self.source.value

        slug = self.slug

        stake_musd_min = self.stake_musd_min

        outcome_external_market_id_field = self.outcome_external_market_id_field

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if endpoint is not UNSET:
            field_dict["endpoint"] = endpoint
        if source is not UNSET:
            field_dict["source"] = source
        if slug is not UNSET:
            field_dict["slug"] = slug
        if stake_musd_min is not UNSET:
            field_dict["stakeMusdMin"] = stake_musd_min
        if outcome_external_market_id_field is not UNSET:
            field_dict["outcomeExternalMarketIdField"] = outcome_external_market_id_field

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        endpoint = d.pop("endpoint", UNSET)

        _source = d.pop("source", UNSET)
        source: PmDiscoveryQuoteHintSource | Unset
        if isinstance(_source, Unset):
            source = UNSET
        else:
            source = PmDiscoveryQuoteHintSource(_source)

        slug = d.pop("slug", UNSET)

        stake_musd_min = d.pop("stakeMusdMin", UNSET)

        outcome_external_market_id_field = d.pop("outcomeExternalMarketIdField", UNSET)

        pm_discovery_quote_hint = cls(
            endpoint=endpoint,
            source=source,
            slug=slug,
            stake_musd_min=stake_musd_min,
            outcome_external_market_id_field=outcome_external_market_id_field,
        )

        pm_discovery_quote_hint.additional_properties = d
        return pm_discovery_quote_hint

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
