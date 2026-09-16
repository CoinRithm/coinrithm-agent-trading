const baseUrl = process.env.COINRITHM_BASE_URL || "https://api.coinrithm.com";
const url = new URL("/api/prediction-markets/events?limit=3", baseUrl);
// Public read: no Authorization header. Node.js 20+; no dependencies.
const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
if (!response.ok)
  throw new Error(`API request failed: HTTP ${response.status}`);
const data = await response.json();
if (!Array.isArray(data.data))
  throw new Error("Expected an events data array.");
console.log(JSON.stringify(data, null, 2));
