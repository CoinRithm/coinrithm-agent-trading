from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..models.pm_paper_v2_open_request_side import PmPaperV2OpenRequestSide
from ..models.pm_paper_v2_open_request_source import PmPaperV2OpenRequestSource
from ..types import UNSET, Unset

T = TypeVar("T", bound="PmPaperV2OpenRequest")


@_attrs_define
class PmPaperV2OpenRequest:
    r"""Any field not listed here (e.g. `stakeMusd`, `agentTrace`,
    `provenance`) returns 400. Decimal fields are strings matching
    `^(0|[1-9]\d*)(\.\d+)?$` (at most 40 characters, 18 decimals).

        Attributes:
            source (PmPaperV2OpenRequestSource):
            slug (str): Event slug (matched case-insensitively).
            outcome_external_market_id (str): Case-sensitive outcome id from v2 discovery.
            side (PmPaperV2OpenRequestSide): Required. `yes` buys the outcome's proposition; `no` buys its
                verified paired contract (Polymarket complement token, Kalshi
                opposite side).
            max_cash_budget (str): Maximum fee-inclusive cash debit in paper mUSD, 10 to 1000000 inclusive. Unused budget
                stays available.
            idempotency_key (str): Globally unique per entry intent (include a UUID). Other formats are refused with
                `invalid_entry_request`.
            forecast_probability (str): Required on API-key opens (missing returns 422
                `forecast_required`). Your probability that the BOUGHT side
                pays out, as a decimal string. A value below 1 is read as a fraction (`"0.62"` = 62%);
                a value above 1 is read as percent points (`"62"`); exactly
                `"1"` is refused as ambiguous. The resulting percent must be
                strictly between 0 and 100. Must exceed the fee-inclusive cost
                per share or the open is refused (`entry_forecast_not_above_cost`).
            min_entry_probability_pct (None | str | Unset): Optional floor, in percentage points 0-100 inclusive (no
                fraction reading), on the acquired pre-fee average price per
                share; below it the open is refused (`entry_probability_below_floor`).
            thesis (None | str | Unset): Optional one-line thesis; no control characters.
    """

    source: PmPaperV2OpenRequestSource
    slug: str
    outcome_external_market_id: str
    side: PmPaperV2OpenRequestSide
    max_cash_budget: str
    idempotency_key: str
    forecast_probability: str
    min_entry_probability_pct: None | str | Unset = UNSET
    thesis: None | str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        source = self.source.value

        slug = self.slug

        outcome_external_market_id = self.outcome_external_market_id

        side = self.side.value

        max_cash_budget = self.max_cash_budget

        idempotency_key = self.idempotency_key

        forecast_probability = self.forecast_probability

        min_entry_probability_pct: None | str | Unset
        if isinstance(self.min_entry_probability_pct, Unset):
            min_entry_probability_pct = UNSET
        else:
            min_entry_probability_pct = self.min_entry_probability_pct

        thesis: None | str | Unset
        if isinstance(self.thesis, Unset):
            thesis = UNSET
        else:
            thesis = self.thesis

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "source": source,
                "slug": slug,
                "outcomeExternalMarketId": outcome_external_market_id,
                "side": side,
                "maxCashBudget": max_cash_budget,
                "idempotencyKey": idempotency_key,
                "forecastProbability": forecast_probability,
            }
        )
        if min_entry_probability_pct is not UNSET:
            field_dict["minEntryProbabilityPct"] = min_entry_probability_pct
        if thesis is not UNSET:
            field_dict["thesis"] = thesis

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        source = PmPaperV2OpenRequestSource(d.pop("source"))

        slug = d.pop("slug")

        outcome_external_market_id = d.pop("outcomeExternalMarketId")

        side = PmPaperV2OpenRequestSide(d.pop("side"))

        max_cash_budget = d.pop("maxCashBudget")

        idempotency_key = d.pop("idempotencyKey")

        forecast_probability = d.pop("forecastProbability")

        def _parse_min_entry_probability_pct(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        min_entry_probability_pct = _parse_min_entry_probability_pct(d.pop("minEntryProbabilityPct", UNSET))

        def _parse_thesis(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        thesis = _parse_thesis(d.pop("thesis", UNSET))

        pm_paper_v2_open_request = cls(
            source=source,
            slug=slug,
            outcome_external_market_id=outcome_external_market_id,
            side=side,
            max_cash_budget=max_cash_budget,
            idempotency_key=idempotency_key,
            forecast_probability=forecast_probability,
            min_entry_probability_pct=min_entry_probability_pct,
            thesis=thesis,
        )

        return pm_paper_v2_open_request
