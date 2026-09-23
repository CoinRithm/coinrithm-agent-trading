import datetime

from coinrithm_sdk.api.reads.get_arena_decisions import _get_kwargs
from coinrithm_sdk.models import ArenaDecision, ArenaDecisionResult, GetArenaDecisionsStatus


def test_open_arena_request_serializes_status_and_house_agent() -> None:
    kwargs = _get_kwargs(status=GetArenaDecisionsStatus.OPEN, agent="a12-house")

    assert kwargs["params"]["status"] == "open"
    assert kwargs["params"]["agent"] == "a12-house"


def test_open_arena_decision_round_trips_pending_nullable_fields() -> None:
    opened_at = datetime.datetime(2026, 9, 23, 16, 0, tzinfo=datetime.timezone.utc)
    decision = ArenaDecision(
        agent="a12-house",
        result=ArenaDecisionResult.PENDING,
        pnl_musd=0,
        opened_at=opened_at,
        brier=None,
        agent_brier=None,
        realized_paper_trade=None,
    )

    payload = decision.to_dict()
    restored = ArenaDecision.from_dict(payload)

    assert payload["result"] == "pending"
    assert payload["pnlMusd"] == 0
    assert payload["openedAt"] == "2026-09-23T16:00:00+00:00"
    assert payload["brier"] is None
    assert payload["agentBrier"] is None
    assert payload["realizedPaperTrade"] is None
    assert restored.to_dict() == payload
