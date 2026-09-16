import json
import os
from urllib.request import urlopen

base_url = os.getenv("COINRITHM_BASE_URL", "https://api.coinrithm.com").rstrip("/")
# Public read: no Authorization header. Python 3.10+; no dependencies.
# urlopen raises HTTPError for non-success responses; this example does not retry.
with urlopen(f"{base_url}/api/prediction-markets/events?limit=3", timeout=30) as response:
    data = json.load(response)
if not isinstance(data.get("data"), list):
    raise RuntimeError("Expected an events data array.")
print(json.dumps(data, indent=2))
