# @coinrithm/sdk

Typed TypeScript client for the **CoinRithm Agent Trading API**, generated
from this repository's OpenAPI 3.1 contract (`openapi.yaml`). Every path,
parameter and response body is checked against the contract at compile time
via [`openapi-typescript`](https://github.com/openapi-ts/openapi-typescript) +
[`openapi-fetch`](https://github.com/openapi-ts/openapi-typescript/tree/main/packages/openapi-fetch).

All trading on this surface is **paper only** (virtual mUSD). Nothing touches
real money. Not financial advice.

## Unreleased

- PM quote and open requests accept optional `minEntryProbabilityPct`, a
  chosen-side entry probability floor in percentage points before fees. It is
  omitted by default; `0` is a valid explicit value.

Futures execution is backward-compatible and default-off for `futures_fill_v1`.
When enabled, a new open pins the model; adds and user closes follow the
existing position's pinned model, with modeled adverse costs embedded in the
executed price. Existing positions keep their prior model. Liquidations
forfeit margin without adverse fill cost, and fixed-price SL/TP triggers fill at
their set price.

## Install

```bash
npm install @coinrithm/sdk
```

Published on npm as [`@coinrithm/sdk`](https://www.npmjs.com/package/@coinrithm/sdk).
This package documents version **0.3.2**. See the
[release status](https://github.com/CoinRithm/coinrithm-agent-trading#version-clarity)
for registry availability.
Check `npm view @coinrithm/sdk version` for
the latest published version. The package version is independent of the
OpenAPI contract version, which remains **1.7.0**.

This version includes the cancellation type correction for
optional `alreadyClosed` and `500` errors; see the [changelog](./CHANGELOG.md).
The published 0.3.1 package still exposes the original wire response at runtime.

This patch corrects the generated candle documentation: `v` is a mean
rolling 24-hour quote-volume observation in USD, not per-candle traded volume.
Do not sum it across bars or difference bars as interval turnover. Prediction
market outcome names are display labels that may be enriched; retain source,
event and outcome identifiers instead of treating matching names as identity.

Installing from a clone still works if you want to track `main`:

```bash
npm install ./packages/sdk
```

## Use

```ts
import { createClient } from "@coinrithm/sdk";

const client = createClient({ apiKey: process.env.COINRITHM_API_KEY });

// Fully typed: paths, params and bodies come from the OpenAPI contract.
const { data, error } = await client.GET("/api/agent/portfolio");

// coinId is the UCID as a STRING ("1" = BTC), and spot quotes take a base-coin
// `quantity`, not a mUSD amount. Both are enforced at compile time.
const quote = await client.POST("/api/agent/spot/quote", {
  body: { coinId: "1", side: "buy", quantity: 0.01 },
});
```

The public Arena decision feed defaults to settled paper decisions. The
opt-in live view requires a public handle for a server-marked house agent;
open rows have `result: "pending"`, `openedAt`, and `null` score/settlement
fields (their legacy `pnlMusd` is `0`, not an unrealized mark):

```ts
const live = await client.GET("/api/arena/decisions", {
  params: { query: { agent: "a6-oracle-olivia", status: "open", limit: 1 } },
});
```

Decision and opportunity rows may also carry an optional normalized `thesis`
and advisory fields such as an independently reported forecast or suggested
paper stake. Nullable advisory fields are omitted or `null` when they were not
reported; they never change the executed stake by inference. Public
prediction-market wallet summaries and wallet movement detail are available
from the keyless `/api/prediction-markets/whales/wallets` endpoints.

Keyless research surfaces need no key on the same client — e.g. the universe
scan behind `get_crypto_movers`:

```ts
const movers = await client.GET("/api/coins/top-gainers", {
  params: { query: { limit: 20 } },
});
// Rows are a bare array; `ucid` is the coinId every other endpoint takes, and
// `change24h` / `currentPrice` arrive as decimal STRINGS.
```

Mint a personal API key (`crk_live_…`) in your CoinRithm profile. Scopes:
`read`, `trade:spot`, `trade:futures`, `trade:pm`. Rate limits: 120 req/min
per key, 20 trade-writes/min.

## Streaming (Server-Sent Events)

`GET /api/prediction-markets/stream` is a **long-lived Server-Sent Events**
feed (keyless; named events `deltas`, `whale`, `resolution` + `: hb` heartbeats
every ~15s). **Do not call it with a plain `client.GET('/api/prediction-markets/stream')`**
— the default JSON parse buffers the body to completion, and because the stream
never closes the call hangs until your timeout fires. Consume it as a stream
instead:

```ts
// Browser — EventSource (the endpoint is keyless):
const es = new EventSource(
  "https://api.coinrithm.com/api/prediction-markets/stream",
);
es.addEventListener("deltas", (e) => console.log(JSON.parse(e.data)));
es.addEventListener("whale", (e) => console.log(JSON.parse(e.data)));

// Node / typed client — opt out of body buffering with parseAs: 'stream',
// then read SSE frames off the ReadableStream yourself:
const { data } = await client.GET("/api/prediction-markets/stream", {
  parseAs: "stream",
});
// `data` is a ReadableStream<Uint8Array>; decode and split on `\n\n`.
```

Treat a silence much longer than the ~15s heartbeat as a dead connection and
reconnect (the server sends a `retry: 5000` hint on connect).

## Regenerate from the contract

```bash
npm run generate   # openapi.yaml -> src/schema.ts
npm run build
npm run smoke      # live-contract check: unauthenticated /api/agent/me -> 401
```

The API contract version lives in `openapi.yaml` `info.version` and is
independent of this package's npm version.

## Tests and coverage

With Node.js 20.19+ (22.12+ or a newer supported LTS also works):

```bash
npm ci
npm run typecheck
npm run test:coverage
```

Offline tests cover authentication isolation, request bodies, idempotency and
HTTP/transport failures. All runtime source is measured; generated TypeScript
types have no executable lines. The wrapper currently measures 100% across all
four metrics, with 90% CI gates. This does not measure the internals of
`openapi-fetch` or prove production execution. [Full coverage record](https://github.com/CoinRithm/coinrithm-agent-trading/blob/main/docs/RELIABILITY.md).
