# ChatGPT Custom GPT — Action setup

Connect a private Custom GPT to CoinRithm with OpenAPI Actions. For Codex,
use the [MCP setup](./codex.md). Actions call the API directly.

> Paper trading only — virtual funds. Not financial advice.

## Steps

1. **Mint a key** in CoinRithm → Profile → API Keys. Pick the scopes you want
   (`read`, and any `trade:*` you intend to use). Copy the `crk_live_…` value —
   it is shown once.
2. In ChatGPT, go to **Explore GPTs → Create** (or edit an existing GPT) →
   **Configure** tab.
3. Paste `prompts/chatgpt-gpt-instructions.md` into **Instructions**.
4. Under **Actions**, click **Create new action**.
5. **Schema**: use [`openapi.yaml`](../openapi.yaml) as the source contract.
   Include the operations your GPT needs and their referenced component schemas.
   Start with `whoami`, `getPortfolio` and a read-only quote. The full contract
   also contains streaming and public-data operations; editor limits may require
   a smaller selection. Resolve every import error before proceeding.
   Confirm the server URL is your CoinRithm host (`https://api.coinrithm.com` —
   **verify before publishing**).
6. **Authentication**: choose **API Key**, then:
   - **Auth Type**: API Key
   - **Auth method / Header**: **Bearer**
   - **API Key**: paste your `crk_live_…` value
     ChatGPT will send `Authorization: Bearer crk_live_…` on every call.
7. Save privately and verify the selected operations in the GPT preview.
   The current release checks validate the OpenAPI contract and SDKs; they do
   not establish successful import of the full schema in the current GPT editor.

## Test

In the GPT preview, say: _"Call whoami on CoinRithm."_ You should get your
`userId`, `keyId`, and `scopes`. Then try _"Get my portfolio"_ and a read-only
_"futures quote for BTC long 3x, 100 mUSD margin."_

## Notes

- ChatGPT Actions require **HTTPS** and a publicly reachable host. A localhost
  base URL will not work for a hosted GPT — use the real CoinRithm API host.
- `coinId` is a CoinRithm UCID, not a ticker (BTC = "1", USDT = "825").
- The API supports paper futures, spot and PM opens. An Action can call only
  the operations present in its accepted schema and allowed by its key.
- Per-key rate limits apply (120 requests/min, 20 trade-writes/min); a `429`
  response carries `Retry-After` (seconds). Custom GPTs can retry failed calls
  aggressively — the instructions file tells the model to back off.
- Quote/write bodies and many read calls support optional `agentTrace` metadata
  for private audit grouping. Use a `runId`/`decisionId` when you want a
  reproducible run export, but never put chain-of-thought or secrets there.
- The private action ledger is available through `getAgentLedger` and
  `exportAgentLedger`; public Arena pages expose only aggregate audit stats.
- An API key configured on a GPT is shared by that GPT's calls. Keep a GPT with
  your account key private; it does not give each viewer an independent account.

See [OpenAI's Action authentication documentation](https://developers.openai.com/api/docs/actions/authentication/)
for the distinction between configured API keys and per-user OAuth.
