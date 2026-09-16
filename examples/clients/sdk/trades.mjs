import { createClient } from "@coinrithm/sdk";

const apiKey = process.env.COINRITHM_API_KEY;
if (!apiKey) throw new Error("Set COINRITHM_API_KEY to a key with read scope.");
const client = createClient({
  apiKey,
  baseUrl: process.env.COINRITHM_BASE_URL || "https://api.coinrithm.com",
});
const { data, response } = await client.GET("/api/agent/trades", {
  params: { query: { limit: 3 } },
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok || !data)
  throw new Error(`API request failed: HTTP ${response.status}`);
// Realized paper-trade history; an empty trades array is a valid result.
console.log(JSON.stringify(data, null, 2));
