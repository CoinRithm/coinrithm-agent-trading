import json
import os

import httpx
from coinrithm_sdk import Client
from coinrithm_sdk.api.public_pm_data import search_public_prediction_market_events

# Client sends no API key, even if one is in your environment.
with Client(
    base_url=os.getenv("COINRITHM_BASE_URL", "https://api.coinrithm.com"),
    timeout=httpx.Timeout(30.0),
) as client:
    response = search_public_prediction_market_events.sync_detailed(client=client, limit=3)
    if response.status_code != 200 or response.parsed is None:
        raise RuntimeError(f"API request failed: HTTP {response.status_code}")
    # Inspect each event's freshness, quality and decisionSupport before using it.
    print(json.dumps(response.parsed.to_dict(), indent=2))
