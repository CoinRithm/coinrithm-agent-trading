from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_discovery_resolution_scope import PmDiscoveryResolutionScope
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.pm_discovery_resolution_settlement_sources_type_0_item import (
        PmDiscoveryResolutionSettlementSourcesType0Item,
    )


T = TypeVar("T", bound="PmDiscoveryResolution")


@_attrs_define
class PmDiscoveryResolution:
    """
    Attributes:
        published (bool): False when the venue publishes no real rule (a question-only
            body); `rules` is then null and the settlement terms are unknown.
        rules (None | str): The de-duplicated rule text joined into one string: the
            condition, the "otherwise" branch and the resolution source when
            the venue states them. Cut at 700 characters with "…".
        rules_truncated (bool):
        settlement_source (None | str):
        settlement_sources (list[PmDiscoveryResolutionSettlementSourcesType0Item] | None): Named outlets the venue says
            it settles from (Kalshi); null elsewhere.
        scope (PmDiscoveryResolutionScope | Unset): Present for venues whose markets each state their own rule
            (Kalshi), even when those rules could not be read (every outcome
            is then `unknown`); absent for other venues, where `rules` is the
            event text as before.
            `per_outcome`: each outcome carries its own exact `rules`, bound by
            provider market id, and this event-level `rules` is ONLY a
            secondary rule every market states identically (compared after
            whitespace normalization), else null. The
            event-level bullets, which mix several markets' conditions, are
            not served. `published` is true when at least one outcome has an
            exact rule.
    """

    published: bool
    rules: None | str
    rules_truncated: bool
    settlement_source: None | str
    settlement_sources: list[PmDiscoveryResolutionSettlementSourcesType0Item] | None
    scope: PmDiscoveryResolutionScope | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        published = self.published

        rules: None | str
        rules = self.rules

        rules_truncated = self.rules_truncated

        settlement_source: None | str
        settlement_source = self.settlement_source

        settlement_sources: list[dict[str, Any]] | None
        if isinstance(self.settlement_sources, list):
            settlement_sources = []
            for settlement_sources_type_0_item_data in self.settlement_sources:
                settlement_sources_type_0_item = settlement_sources_type_0_item_data.to_dict()
                settlement_sources.append(settlement_sources_type_0_item)

        else:
            settlement_sources = self.settlement_sources

        scope: str | Unset = UNSET
        if not isinstance(self.scope, Unset):
            scope = self.scope.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "published": published,
                "rules": rules,
                "rulesTruncated": rules_truncated,
                "settlementSource": settlement_source,
                "settlementSources": settlement_sources,
            }
        )
        if scope is not UNSET:
            field_dict["scope"] = scope

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.pm_discovery_resolution_settlement_sources_type_0_item import (
            PmDiscoveryResolutionSettlementSourcesType0Item,
        )

        d = dict(src_dict)
        published = d.pop("published")

        def _parse_rules(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        rules = _parse_rules(d.pop("rules"))

        rules_truncated = d.pop("rulesTruncated")

        def _parse_settlement_source(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        settlement_source = _parse_settlement_source(d.pop("settlementSource"))

        def _parse_settlement_sources(data: object) -> list[PmDiscoveryResolutionSettlementSourcesType0Item] | None:
            if data is None:
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                settlement_sources_type_0 = []
                _settlement_sources_type_0 = data
                for settlement_sources_type_0_item_data in _settlement_sources_type_0:
                    settlement_sources_type_0_item = PmDiscoveryResolutionSettlementSourcesType0Item.from_dict(
                        settlement_sources_type_0_item_data
                    )

                    settlement_sources_type_0.append(settlement_sources_type_0_item)

                return settlement_sources_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[PmDiscoveryResolutionSettlementSourcesType0Item] | None, data)

        settlement_sources = _parse_settlement_sources(d.pop("settlementSources"))

        _scope = d.pop("scope", UNSET)
        scope: PmDiscoveryResolutionScope | Unset
        if isinstance(_scope, Unset):
            scope = UNSET
        else:
            scope = PmDiscoveryResolutionScope(_scope)

        pm_discovery_resolution = cls(
            published=published,
            rules=rules,
            rules_truncated=rules_truncated,
            settlement_source=settlement_source,
            settlement_sources=settlement_sources,
            scope=scope,
        )

        pm_discovery_resolution.additional_properties = d
        return pm_discovery_resolution

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
