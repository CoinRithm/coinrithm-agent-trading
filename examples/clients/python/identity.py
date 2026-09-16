import json
import os

import httpx
from coinrithm_sdk import AuthenticatedClient
from coinrithm_sdk.api.identity import whoami

api_key = os.getenv("COINRITHM_API_KEY")
if not api_key:
    raise RuntimeError("Set COINRITHM_API_KEY to your personal key.")
with AuthenticatedClient(
    base_url=os.getenv("COINRITHM_BASE_URL", "https://api.coinrithm.com"),
    token=api_key,
    timeout=httpx.Timeout(30.0),
) as client:
    response = whoami.sync_detailed(client=client)
    if response.status_code != 200 or response.parsed is None:
        raise RuntimeError(f"API request failed: HTTP {response.status_code}")
    # Account identity and scopes; never print the API key itself.
    print(json.dumps(response.parsed.to_dict(), indent=2))
