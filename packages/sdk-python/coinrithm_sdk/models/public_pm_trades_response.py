from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..models.public_pm_source_slug import PublicPmSourceSlug

if TYPE_CHECKING:
    from ..models.public_pm_microstructure_outcome_type_0 import PublicPmMicrostructureOutcomeType0
    from ..models.public_pm_trade import PublicPmTrade


T = TypeVar("T", bound="PublicPmTradesResponse")


@_attrs_define
class PublicPmTradesResponse:
    """
    Attributes:
        source (PublicPmSourceSlug):
        slug (str):
        outcome (None | PublicPmMicrostructureOutcomeType0): Which outcome this microstructure read describes; null when
            the event has neither an outcome name nor id.
        trades (list[PublicPmTrade]): Most recent trades, fixed server cap of 20; not client-configurable.
    """

    source: PublicPmSourceSlug
    slug: str
    outcome: None | PublicPmMicrostructureOutcomeType0
    trades: list[PublicPmTrade]

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_pm_microstructure_outcome_type_0 import PublicPmMicrostructureOutcomeType0

        source = self.source.value

        slug = self.slug

        outcome: dict[str, Any] | None
        if isinstance(self.outcome, PublicPmMicrostructureOutcomeType0):
            outcome = self.outcome.to_dict()
        else:
            outcome = self.outcome

        trades = []
        for trades_item_data in self.trades:
            trades_item = trades_item_data.to_dict()
            trades.append(trades_item)

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "source": source,
                "slug": slug,
                "outcome": outcome,
                "trades": trades,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_microstructure_outcome_type_0 import PublicPmMicrostructureOutcomeType0
        from ..models.public_pm_trade import PublicPmTrade

        d = dict(src_dict)
        source = PublicPmSourceSlug(d.pop("source"))

        slug = d.pop("slug")

        def _parse_outcome(data: object) -> None | PublicPmMicrostructureOutcomeType0:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_public_pm_microstructure_outcome_type_0 = (
                    PublicPmMicrostructureOutcomeType0.from_dict(data)
                )

                return componentsschemas_public_pm_microstructure_outcome_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicPmMicrostructureOutcomeType0, data)

        outcome = _parse_outcome(d.pop("outcome"))

        trades = []
        _trades = d.pop("trades")
        for trades_item_data in _trades:
            trades_item = PublicPmTrade.from_dict(trades_item_data)

            trades.append(trades_item)

        public_pm_trades_response = cls(
            source=source,
            slug=slug,
            outcome=outcome,
            trades=trades,
        )

        return public_pm_trades_response
