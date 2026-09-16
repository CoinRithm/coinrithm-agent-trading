import { createClient } from "@coinrithm/sdk";

const apiKey = process.env.COINRITHM_API_KEY;
if (!apiKey) throw new Error("Set COINRITHM_API_KEY to your personal key.");
const client = createClient({
  apiKey,
  baseUrl: process.env.COINRITHM_BASE_URL || "https://api.coinrithm.com",
});
const { data, response } = await client.GET("/api/agent/me", {
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok || !data)
  throw new Error(`API request failed: HTTP ${response.status}`);
// Account identity and scopes; never print the API key itself.
console.log(JSON.stringify(data, null, 2));
