from coinrithm_sdk.models.spot_order_response import SpotOrderResponse

# Shapes from backend-v2 placeOrder.ts / orderService.findSpotReplay: a fresh
# market buy, and the idempotent replay of a pre-realism fill, which returns
# executionModel null plus the status that explains it.
FRESH_BUY = {
    "message": "Market order executed successfully",
    "orderId": 41,
    "summary": {
        "side": "buy",
        "quantity": 1,
        "executionPrice": 67000,
        "totalCost": 67000,
        "feeUsd": 26.8,
        "slippageUsd": 33.5,
        "pnl": None,
    },
}
REPLAY = {
    "message": "Market order executed successfully",
    "orderId": 41,
    "summary": {
        "side": "buy",
        "quantity": 1,
        "executionPrice": 67000,
        "totalCost": 67000,
        "feeUsd": None,
        "slippageUsd": None,
        "executionVersion": None,
        "executionModel": None,
        "executionModelStatus": "historical_parameters_not_retained",
        "pnl": None,
    },
    "idempotentReplay": True,
}


def test_market_fill_and_its_replay_parse_with_the_ledger_id() -> None:
    for body in (FRESH_BUY, REPLAY):
        order = SpotOrderResponse.from_dict(body)
        assert order.order_id == 41
        assert order.summary.pnl is None
        round_trip = order.to_dict()
        assert round_trip["orderId"] == 41
        assert round_trip["summary"]["pnl"] is None

    replay = SpotOrderResponse.from_dict(REPLAY).to_dict()
    assert replay["summary"]["executionModel"] is None
    assert replay["summary"]["executionModelStatus"] == "historical_parameters_not_retained"
    assert replay["summary"]["executionVersion"] is None
    assert replay["idempotentReplay"] is True


def test_resting_order_ack_has_no_order_id() -> None:
    ack = SpotOrderResponse.from_dict({
        "message": "Order placed successfully",
        "summary": {"side": "buy", "quantity": 1, "limitPrice": 60000, "orderType": "limit"},
    })
    assert "orderId" not in ack.to_dict()
