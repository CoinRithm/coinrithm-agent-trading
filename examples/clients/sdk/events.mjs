import { createClient } from "@coinrithm/sdk";

// Public discovery never sends an API key, even if one is in your environment.
const client = createClient({
  baseUrl: process.env.COINRITHM_BASE_URL || "https://api.coinrithm.com",
});
const { data, response } = await client.GET("/api/prediction-markets/events", {
  params: { query: { limit: 3 } },
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok || !data)
  throw new Error(`API request failed: HTTP ${response.status}`);
// Inspect each event's freshness, quality and decisionSupport before using it.
console.log(JSON.stringify(data, null, 2));
