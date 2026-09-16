import { createClient } from "@coinrithm/sdk";

const apiKey = process.env.COINRITHM_API_KEY;
if (!apiKey) throw new Error("Set COINRITHM_API_KEY to a key with read scope.");
const client = createClient({
  apiKey,
  baseUrl: process.env.COINRITHM_BASE_URL || "https://api.coinrithm.com",
});
// A quote checks a hypothetical paper order. It does not submit an order.
const { data, response } = await client.POST("/api/agent/spot/quote", {
  body: { coinId: "1", side: "buy", quantity: 0.01 },
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok || !data)
  throw new Error(`API request failed: HTTP ${response.status}`);
// HTTP 200 can still mean eligible: false. Inspect blockReasons and freshness.
console.log(JSON.stringify(data, null, 2));
