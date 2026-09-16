import json
import os

import httpx
from coinrithm_sdk import AuthenticatedClient
from coinrithm_sdk.api.spot import spot_quote
from coinrithm_sdk.models.spot_quote_request import SpotQuoteRequest
from coinrithm_sdk.models.spot_quote_request_side import SpotQuoteRequestSide

api_key = os.getenv("COINRITHM_API_KEY")
if not api_key:
    raise RuntimeError("Set COINRITHM_API_KEY to a key with read scope.")
with AuthenticatedClient(
    base_url=os.getenv("COINRITHM_BASE_URL", "https://api.coinrithm.com"),
    token=api_key,
    timeout=httpx.Timeout(30.0),
) as client:
    # A quote checks a hypothetical paper order. It does not submit an order.
    response = spot_quote.sync_detailed(
        client=client,
        body=SpotQuoteRequest(coin_id="1", side=SpotQuoteRequestSide.BUY, quantity=0.01),
    )
    if response.status_code != 200 or response.parsed is None:
        raise RuntimeError(f"API request failed: HTTP {response.status_code}")
    # HTTP 200 can still mean eligible: false. Inspect blockReasons and freshness.
    print(json.dumps(response.parsed.to_dict(), indent=2))
