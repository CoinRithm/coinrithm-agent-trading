from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_discovery_market_source import PmDiscoveryMarketSource
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.decision_support import DecisionSupport
    from ..models.freshness import Freshness
    from ..models.pm_discovery_outcome import PmDiscoveryOutcome
    from ..models.pm_discovery_quote_hint import PmDiscoveryQuoteHint
    from ..models.pm_quality import PmQuality


T = TypeVar("T", bound="PmDiscoveryMarket")


@_attrs_define
class PmDiscoveryMarket:
    """
    Attributes:
        source (PmDiscoveryMarketSource | Unset):
        slug (str | Unset):
        title (str | Unset):
        end_date (datetime.datetime | None | Unset):
        freshness (Freshness | Unset): Data-freshness descriptor. Futures + spot use ageSeconds; PM uses
            ageMinutes. `status` is a freshness label; `basis` (PM only) names which
            timestamp the age was measured against.
        pinned (bool | Unset): True when the market is effectively decided (leading outcome at/
            above the pinned-probability threshold). Deranked in this listing —
            agents can skip these without recomputing.
        eligible (bool | None | Unset): Can an agent open this binary book right now (shared mock-entry
            gate)? null when scalars are unavailable. Eligible markets are
            listed first.
        eligible_block_reasons (list[str] | Unset): Structured reasons the market is not openable (e.g. multi-outcome /
            non-binary / settled). Empty when eligible or unknown.
        quality (PmQuality | Unset): Persisted quality assessment from CoinRithm's truth engine — the
            aggregator's proven, versioned verdict for this event (one current
            state per event, updated when facts change). Markets with critical
            failures remain visible everywhere; `decisionEligible: false` means
            new paper opens are BLOCKED (pm/open returns 422 with these stored
            reasons) and alerts are suppressed. Omitted entirely when no
            assessment row exists yet (brand-new events) — never fabricated.
        outcomes (list[PmDiscoveryOutcome] | Unset):
        volume24h (float | Unset):
        liquidity (float | Unset):
        spread (float | None | Unset):
        decision_support (DecisionSupport | None | Unset):
        quote_hint (PmDiscoveryQuoteHint | Unset):
    """

    source: PmDiscoveryMarketSource | Unset = UNSET
    slug: str | Unset = UNSET
    title: str | Unset = UNSET
    end_date: datetime.datetime | None | Unset = UNSET
    freshness: Freshness | Unset = UNSET
    pinned: bool | Unset = UNSET
    eligible: bool | None | Unset = UNSET
    eligible_block_reasons: list[str] | Unset = UNSET
    quality: PmQuality | Unset = UNSET
    outcomes: list[PmDiscoveryOutcome] | Unset = UNSET
    volume24h: float | Unset = UNSET
    liquidity: float | Unset = UNSET
    spread: float | None | Unset = UNSET
    decision_support: DecisionSupport | None | Unset = UNSET
    quote_hint: PmDiscoveryQuoteHint | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.decision_support import DecisionSupport

        source: str | Unset = UNSET
        if not isinstance(self.source, Unset):
            source = self.source.value

        slug = self.slug

        title = self.title

        end_date: None | str | Unset
        if isinstance(self.end_date, Unset):
            end_date = UNSET
        elif isinstance(self.end_date, datetime.datetime):
            end_date = self.end_date.isoformat()
        else:
            end_date = self.end_date

        freshness: dict[str, Any] | Unset = UNSET
        if not isinstance(self.freshness, Unset):
            freshness = self.freshness.to_dict()

        pinned = self.pinned

        eligible: bool | None | Unset
        if isinstance(self.eligible, Unset):
            eligible = UNSET
        else:
            eligible = self.eligible

        eligible_block_reasons: list[str] | Unset = UNSET
        if not isinstance(self.eligible_block_reasons, Unset):
            eligible_block_reasons = self.eligible_block_reasons

        quality: dict[str, Any] | Unset = UNSET
        if not isinstance(self.quality, Unset):
            quality = self.quality.to_dict()

        outcomes: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.outcomes, Unset):
            outcomes = []
            for outcomes_item_data in self.outcomes:
                outcomes_item = outcomes_item_data.to_dict()
                outcomes.append(outcomes_item)

        volume24h = self.volume24h

        liquidity = self.liquidity

        spread: float | None | Unset
        if isinstance(self.spread, Unset):
            spread = UNSET
        else:
            spread = self.spread

        decision_support: dict[str, Any] | None | Unset
        if isinstance(self.decision_support, Unset):
            decision_support = UNSET
        elif isinstance(self.decision_support, DecisionSupport):
            decision_support = self.decision_support.to_dict()
        else:
            decision_support = self.decision_support

        quote_hint: dict[str, Any] | Unset = UNSET
        if not isinstance(self.quote_hint, Unset):
            quote_hint = self.quote_hint.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if source is not UNSET:
            field_dict["source"] = source
        if slug is not UNSET:
            field_dict["slug"] = slug
        if title is not UNSET:
            field_dict["title"] = title
        if end_date is not UNSET:
            field_dict["endDate"] = end_date
        if freshness is not UNSET:
            field_dict["freshness"] = freshness
        if pinned is not UNSET:
            field_dict["pinned"] = pinned
        if eligible is not UNSET:
            field_dict["eligible"] = eligible
        if eligible_block_reasons is not UNSET:
            field_dict["eligibleBlockReasons"] = eligible_block_reasons
        if quality is not UNSET:
            field_dict["quality"] = quality
        if outcomes is not UNSET:
            field_dict["outcomes"] = outcomes
        if volume24h is not UNSET:
            field_dict["volume24h"] = volume24h
        if liquidity is not UNSET:
            field_dict["liquidity"] = liquidity
        if spread is not UNSET:
            field_dict["spread"] = spread
        if decision_support is not UNSET:
            field_dict["decisionSupport"] = decision_support
        if quote_hint is not UNSET:
            field_dict["quoteHint"] = quote_hint

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.decision_support import DecisionSupport
        from ..models.freshness import Freshness
        from ..models.pm_discovery_outcome import PmDiscoveryOutcome
        from ..models.pm_discovery_quote_hint import PmDiscoveryQuoteHint
        from ..models.pm_quality import PmQuality

        d = dict(src_dict)
        _source = d.pop("source", UNSET)
        source: PmDiscoveryMarketSource | Unset
        if isinstance(_source, Unset):
            source = UNSET
        else:
            source = PmDiscoveryMarketSource(_source)

        slug = d.pop("slug", UNSET)

        title = d.pop("title", UNSET)

        def _parse_end_date(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                end_date_type_0 = datetime.datetime.fromisoformat(data)

                return end_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        end_date = _parse_end_date(d.pop("endDate", UNSET))

        _freshness = d.pop("freshness", UNSET)
        freshness: Freshness | Unset
        if isinstance(_freshness, Unset):
            freshness = UNSET
        else:
            freshness = Freshness.from_dict(_freshness)

        pinned = d.pop("pinned", UNSET)

        def _parse_eligible(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        eligible = _parse_eligible(d.pop("eligible", UNSET))

        eligible_block_reasons = cast(list[str], d.pop("eligibleBlockReasons", UNSET))

        _quality = d.pop("quality", UNSET)
        quality: PmQuality | Unset
        if isinstance(_quality, Unset):
            quality = UNSET
        else:
            quality = PmQuality.from_dict(_quality)

        _outcomes = d.pop("outcomes", UNSET)
        outcomes: list[PmDiscoveryOutcome] | Unset = UNSET
        if _outcomes is not UNSET:
            outcomes = []
            for outcomes_item_data in _outcomes:
                outcomes_item = PmDiscoveryOutcome.from_dict(outcomes_item_data)

                outcomes.append(outcomes_item)

        volume24h = d.pop("volume24h", UNSET)

        liquidity = d.pop("liquidity", UNSET)

        def _parse_spread(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        spread = _parse_spread(d.pop("spread", UNSET))

        def _parse_decision_support(data: object) -> DecisionSupport | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                decision_support_type_0 = DecisionSupport.from_dict(data)

                return decision_support_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(DecisionSupport | None | Unset, data)

        decision_support = _parse_decision_support(d.pop("decisionSupport", UNSET))

        _quote_hint = d.pop("quoteHint", UNSET)
        quote_hint: PmDiscoveryQuoteHint | Unset
        if isinstance(_quote_hint, Unset):
            quote_hint = UNSET
        else:
            quote_hint = PmDiscoveryQuoteHint.from_dict(_quote_hint)

        pm_discovery_market = cls(
            source=source,
            slug=slug,
            title=title,
            end_date=end_date,
            freshness=freshness,
            pinned=pinned,
            eligible=eligible,
            eligible_block_reasons=eligible_block_reasons,
            quality=quality,
            outcomes=outcomes,
            volume24h=volume24h,
            liquidity=liquidity,
            spread=spread,
            decision_support=decision_support,
            quote_hint=quote_hint,
        )

        pm_discovery_market.additional_properties = d
        return pm_discovery_market

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
