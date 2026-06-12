# ChatGPT Custom GPT — Action setup

Wire CoinRithm paper trading into a Custom GPT (or Codex agent that consumes
OpenAPI tools) using `openapi.yaml`.

> Paper trading only — virtual funds. Not financial advice.

## Steps

1. **Mint a key** in CoinRithm → Profile → API Keys. Pick the scopes you want
   (`read`, and any `trade:*` you intend to use). Copy the `crk_live_…` value —
   it is shown once.
2. In ChatGPT, go to **Explore GPTs → Create** (or edit an existing GPT) →
   **Configure** tab.
3. Paste `prompts/chatgpt-gpt-instructions.md` into **Instructions**.
4. Under **Actions**, click **Create new action**.
5. **Schema**: click **Import** and upload `openapi.yaml` (or paste its contents).
   Confirm the server URL is your CoinRithm host (`https://api.coinrithm.com` —
   **verify before publishing**).
6. **Authentication**: choose **API Key**, then:
   - **Auth Type**: API Key
   - **Auth method / Header**: **Bearer**
   - **API Key**: paste your `crk_live_…` value
   ChatGPT will send `Authorization: Bearer crk_live_…` on every call.
7. Save. The Action exposes operations like `whoami`, `getPortfolio`,
   `getWallet`, `futuresQuote`, `placeSpotOrder`, `setFuturesSlTp`,
   `getAgentLedger`, `exportAgentLedger`, etc.

## Test

In the GPT preview, say: *"Call whoami on CoinRithm."* You should get your
`userId`, `keyId`, and `scopes`. Then try *"Get my portfolio"* and a read-only
*"futures quote for BTC long 3x, 100 mUSD margin."*

## Notes

- ChatGPT Actions require **HTTPS** and a publicly reachable host. A localhost
  base URL will not work for a hosted GPT — use the real CoinRithm API host.
- `coinId` is a CoinRithm UCID, not a ticker (BTC = "1", USDT = "825").
- All venues are live: futures-open, PM-open, spot orders, reads, quotes, and
  futures-close all work (mock paper trading).
- Per-key rate limits apply (120 requests/min, 20 trade-writes/min); a `429`
  response carries `Retry-After` (seconds). Custom GPTs can retry failed calls
  aggressively — the instructions file tells the model to back off.
- Quote/write bodies and many read calls support optional `agentTrace` metadata
  for private audit grouping. Use a `runId`/`decisionId` when you want a
  reproducible run export, but never put chain-of-thought or secrets there.
- The private action ledger is available through `getAgentLedger` and
  `exportAgentLedger`; public Arena pages expose only aggregate audit stats.
- Keep the key least-privilege; revoke it from your profile if the GPT is shared.
