from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_quote_response_side import PmQuoteResponseSide
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_observation import AgentObservation
    from ..models.decision_support import DecisionSupport
    from ..models.execution_model import ExecutionModel
    from ..models.freshness import Freshness
    from ..models.pm_quality import PmQuality
    from ..models.pm_quote_response_eligibility import PmQuoteResponseEligibility
    from ..models.pm_quote_response_event import PmQuoteResponseEvent
    from ..models.pm_quote_response_frozen_entry_snapshot import PmQuoteResponseFrozenEntrySnapshot


T = TypeVar("T", bound="PmQuoteResponse")


@_attrs_define
class PmQuoteResponse:
    """
    Attributes:
        eligible (bool | Unset):
        block_reasons (list[str] | Unset):
        fill_basis (str | Unset):
        side (PmQuoteResponseSide | Unset):
        entry_probability (float | None | Unset): 0..100
        shares_estimate (float | None | Unset):
        max_payout (float | None | Unset):
        stake_musd (float | Unset):
        min_stake (float | Unset):
        frozen_entry_snapshot (PmQuoteResponseFrozenEntrySnapshot | Unset):
        freshness (Freshness | Unset): Data-freshness descriptor. Futures + spot use ageSeconds; PM uses
            ageMinutes. `status` is a freshness label; `basis` (PM only) names which
            timestamp the age was measured against.
        decision_support (DecisionSupport | Unset): Pre-computed market-quality grade for a prediction market (the same
            builder the web event/hub cards use): a quality score + tiered
            liquidity/volume/spread + risk flags. Lets an agent gauge tradability
            without running its own analysis. Returned by get_market_context's
            relatedMarkets and by pm/quote.
        quality (PmQuality | Unset): Persisted quality assessment from CoinRithm's truth engine — the
            aggregator's proven, versioned verdict for this event (one current
            state per event, updated when facts change). Markets with critical
            failures remain visible everywhere; `decisionEligible: false` means
            new paper opens are BLOCKED (pm/open returns 422 with these stored
            reasons) and alerts are suppressed. Omitted entirely when no
            assessment row exists yet (brand-new events) — never fabricated.
        open_blocked (bool | Unset): Preview of the pm/open quality gate for this event: true when a
            pm/open attempt would be rejected 422 right now (quality state
            missing, stale, or decisionEligible=false). Distinct from
            `eligible`/`blockReasons`, which describe the mock-entry shape
            gate — both must pass to open.
        open_block_reasons (list[str] | Unset): Stable reason codes mirroring what pm/open would return
            (quality_state_missing, quality_state_stale, or the stored blockReasons).
        execution_model (ExecutionModel | Unset): Paper Execution Realism v1 cost disclosure. Paper fills apply a
            deterministic, fully-disclosed cost so simulated PnL reflects real
            trading friction (a flat round-trip is a small loss, not a free
            breakeven). This is a rehearsal cost model, NOT an exchange fill
            guarantee. Per venue:
              - spot/futures: a taker fee (`feeBps`) on notional, folded into
                realized PnL. Spot market orders also fill at an adverse price
                (half-spread + slippage); futures entry/exit spread/slippage is
                not modeled in v1.
              - PM: fills at the ask (mid + half the ingested bid-ask spread) with
                size/liquidity-based slippage and a Polymarket-shaped taker fee
                (~1.8% near 50%, ~0 at the extremes), folded into `sharesMusd`.
                `feeBps`/`spreadBps` are positive and `slippageBps` scales with
                order size; `entryProbability` stays the mid for calibration.
            Funding rates, order-book depth, latency, and market impact are not
            modeled.
        eligibility (PmQuoteResponseEligibility | Unset):
        event (PmQuoteResponseEvent | Unset):
        observation (AgentObservation | Unset): Compact provenance block for an agent-facing market observation. It is
            also stored in the private ledger responseSummary when the request uses
            agentTrace/run headers, giving run exports a verifiable snapshot of what
            the agent observed without creating a full market archive.
    """

    eligible: bool | Unset = UNSET
    block_reasons: list[str] | Unset = UNSET
    fill_basis: str | Unset = UNSET
    side: PmQuoteResponseSide | Unset = UNSET
    entry_probability: float | None | Unset = UNSET
    shares_estimate: float | None | Unset = UNSET
    max_payout: float | None | Unset = UNSET
    stake_musd: float | Unset = UNSET
    min_stake: float | Unset = UNSET
    frozen_entry_snapshot: PmQuoteResponseFrozenEntrySnapshot | Unset = UNSET
    freshness: Freshness | Unset = UNSET
    decision_support: DecisionSupport | Unset = UNSET
    quality: PmQuality | Unset = UNSET
    open_blocked: bool | Unset = UNSET
    open_block_reasons: list[str] | Unset = UNSET
    execution_model: ExecutionModel | Unset = UNSET
    eligibility: PmQuoteResponseEligibility | Unset = UNSET
    event: PmQuoteResponseEvent | Unset = UNSET
    observation: AgentObservation | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        eligible = self.eligible

        block_reasons: list[str] | Unset = UNSET
        if not isinstance(self.block_reasons, Unset):
            block_reasons = self.block_reasons

        fill_basis = self.fill_basis

        side: str | Unset = UNSET
        if not isinstance(self.side, Unset):
            side = self.side.value

        entry_probability: float | None | Unset
        if isinstance(self.entry_probability, Unset):
            entry_probability = UNSET
        else:
            entry_probability = self.entry_probability

        shares_estimate: float | None | Unset
        if isinstance(self.shares_estimate, Unset):
            shares_estimate = UNSET
        else:
            shares_estimate = self.shares_estimate

        max_payout: float | None | Unset
        if isinstance(self.max_payout, Unset):
            max_payout = UNSET
        else:
            max_payout = self.max_payout

        stake_musd = self.stake_musd

        min_stake = self.min_stake

        frozen_entry_snapshot: dict[str, Any] | Unset = UNSET
        if not isinstance(self.frozen_entry_snapshot, Unset):
            frozen_entry_snapshot = self.frozen_entry_snapshot.to_dict()

        freshness: dict[str, Any] | Unset = UNSET
        if not isinstance(self.freshness, Unset):
            freshness = self.freshness.to_dict()

        decision_support: dict[str, Any] | Unset = UNSET
        if not isinstance(self.decision_support, Unset):
            decision_support = self.decision_support.to_dict()

        quality: dict[str, Any] | Unset = UNSET
        if not isinstance(self.quality, Unset):
            quality = self.quality.to_dict()

        open_blocked = self.open_blocked

        open_block_reasons: list[str] | Unset = UNSET
        if not isinstance(self.open_block_reasons, Unset):
            open_block_reasons = self.open_block_reasons

        execution_model: dict[str, Any] | Unset = UNSET
        if not isinstance(self.execution_model, Unset):
            execution_model = self.execution_model.to_dict()

        eligibility: dict[str, Any] | Unset = UNSET
        if not isinstance(self.eligibility, Unset):
            eligibility = self.eligibility.to_dict()

        event: dict[str, Any] | Unset = UNSET
        if not isinstance(self.event, Unset):
            event = self.event.to_dict()

        observation: dict[str, Any] | Unset = UNSET
        if not isinstance(self.observation, Unset):
            observation = self.observation.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if eligible is not UNSET:
            field_dict["eligible"] = eligible
        if block_reasons is not UNSET:
            field_dict["blockReasons"] = block_reasons
        if fill_basis is not UNSET:
            field_dict["fillBasis"] = fill_basis
        if side is not UNSET:
            field_dict["side"] = side
        if entry_probability is not UNSET:
            field_dict["entryProbability"] = entry_probability
        if shares_estimate is not UNSET:
            field_dict["sharesEstimate"] = shares_estimate
        if max_payout is not UNSET:
            field_dict["maxPayout"] = max_payout
        if stake_musd is not UNSET:
            field_dict["stakeMusd"] = stake_musd
        if min_stake is not UNSET:
            field_dict["minStake"] = min_stake
        if frozen_entry_snapshot is not UNSET:
            field_dict["frozenEntrySnapshot"] = frozen_entry_snapshot
        if freshness is not UNSET:
            field_dict["freshness"] = freshness
        if decision_support is not UNSET:
            field_dict["decisionSupport"] = decision_support
        if quality is not UNSET:
            field_dict["quality"] = quality
        if open_blocked is not UNSET:
            field_dict["openBlocked"] = open_blocked
        if open_block_reasons is not UNSET:
            field_dict["openBlockReasons"] = open_block_reasons
        if execution_model is not UNSET:
            field_dict["executionModel"] = execution_model
        if eligibility is not UNSET:
            field_dict["eligibility"] = eligibility
        if event is not UNSET:
            field_dict["event"] = event
        if observation is not UNSET:
            field_dict["observation"] = observation

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_observation import AgentObservation
        from ..models.decision_support import DecisionSupport
        from ..models.execution_model import ExecutionModel
        from ..models.freshness import Freshness
        from ..models.pm_quality import PmQuality
        from ..models.pm_quote_response_eligibility import PmQuoteResponseEligibility
        from ..models.pm_quote_response_event import PmQuoteResponseEvent
        from ..models.pm_quote_response_frozen_entry_snapshot import PmQuoteResponseFrozenEntrySnapshot

        d = dict(src_dict)
        eligible = d.pop("eligible", UNSET)

        block_reasons = cast(list[str], d.pop("blockReasons", UNSET))

        fill_basis = d.pop("fillBasis", UNSET)

        _side = d.pop("side", UNSET)
        side: PmQuoteResponseSide | Unset
        if isinstance(_side, Unset):
            side = UNSET
        else:
            side = PmQuoteResponseSide(_side)

        def _parse_entry_probability(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        entry_probability = _parse_entry_probability(d.pop("entryProbability", UNSET))

        def _parse_shares_estimate(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        shares_estimate = _parse_shares_estimate(d.pop("sharesEstimate", UNSET))

        def _parse_max_payout(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        max_payout = _parse_max_payout(d.pop("maxPayout", UNSET))

        stake_musd = d.pop("stakeMusd", UNSET)

        min_stake = d.pop("minStake", UNSET)

        _frozen_entry_snapshot = d.pop("frozenEntrySnapshot", UNSET)
        frozen_entry_snapshot: PmQuoteResponseFrozenEntrySnapshot | Unset
        if isinstance(_frozen_entry_snapshot, Unset):
            frozen_entry_snapshot = UNSET
        else:
            frozen_entry_snapshot = PmQuoteResponseFrozenEntrySnapshot.from_dict(_frozen_entry_snapshot)

        _freshness = d.pop("freshness", UNSET)
        freshness: Freshness | Unset
        if isinstance(_freshness, Unset):
            freshness = UNSET
        else:
            freshness = Freshness.from_dict(_freshness)

        _decision_support = d.pop("decisionSupport", UNSET)
        decision_support: DecisionSupport | Unset
        if isinstance(_decision_support, Unset):
            decision_support = UNSET
        else:
            decision_support = DecisionSupport.from_dict(_decision_support)

        _quality = d.pop("quality", UNSET)
        quality: PmQuality | Unset
        if isinstance(_quality, Unset):
            quality = UNSET
        else:
            quality = PmQuality.from_dict(_quality)

        open_blocked = d.pop("openBlocked", UNSET)

        open_block_reasons = cast(list[str], d.pop("openBlockReasons", UNSET))

        _execution_model = d.pop("executionModel", UNSET)
        execution_model: ExecutionModel | Unset
        if isinstance(_execution_model, Unset):
            execution_model = UNSET
        else:
            execution_model = ExecutionModel.from_dict(_execution_model)

        _eligibility = d.pop("eligibility", UNSET)
        eligibility: PmQuoteResponseEligibility | Unset
        if isinstance(_eligibility, Unset):
            eligibility = UNSET
        else:
            eligibility = PmQuoteResponseEligibility.from_dict(_eligibility)

        _event = d.pop("event", UNSET)
        event: PmQuoteResponseEvent | Unset
        if isinstance(_event, Unset):
            event = UNSET
        else:
            event = PmQuoteResponseEvent.from_dict(_event)

        _observation = d.pop("observation", UNSET)
        observation: AgentObservation | Unset
        if isinstance(_observation, Unset):
            observation = UNSET
        else:
            observation = AgentObservation.from_dict(_observation)

        pm_quote_response = cls(
            eligible=eligible,
            block_reasons=block_reasons,
            fill_basis=fill_basis,
            side=side,
            entry_probability=entry_probability,
            shares_estimate=shares_estimate,
            max_payout=max_payout,
            stake_musd=stake_musd,
            min_stake=min_stake,
            frozen_entry_snapshot=frozen_entry_snapshot,
            freshness=freshness,
            decision_support=decision_support,
            quality=quality,
            open_blocked=open_blocked,
            open_block_reasons=open_block_reasons,
            execution_model=execution_model,
            eligibility=eligibility,
            event=event,
            observation=observation,
        )

        pm_quote_response.additional_properties = d
        return pm_quote_response

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
