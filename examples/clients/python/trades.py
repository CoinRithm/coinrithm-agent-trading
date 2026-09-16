import json
import os

import httpx
from coinrithm_sdk import AuthenticatedClient
from coinrithm_sdk.api.reads import get_my_trades

api_key = os.getenv("COINRITHM_API_KEY")
if not api_key:
    raise RuntimeError("Set COINRITHM_API_KEY to a key with read scope.")
with AuthenticatedClient(
    base_url=os.getenv("COINRITHM_BASE_URL", "https://api.coinrithm.com"),
    token=api_key,
    timeout=httpx.Timeout(30.0),
) as client:
    response = get_my_trades.sync_detailed(client=client, limit=3)
    if response.status_code != 200 or response.parsed is None:
        raise RuntimeError(f"API request failed: HTTP {response.status_code}")
    # Realized paper-trade history; an empty trades array is a valid result.
    print(json.dumps(response.parsed.to_dict(), indent=2))
