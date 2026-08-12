# @coinrithm/sdk

Typed TypeScript client for the **CoinRithm Agent Trading API**, generated
from this repository's OpenAPI 3.1 contract (`openapi.yaml`). Every path,
parameter and response body is checked against the contract at compile time
via [`openapi-typescript`](https://github.com/openapi-ts/openapi-typescript) +
[`openapi-fetch`](https://github.com/openapi-ts/openapi-typescript/tree/main/packages/openapi-fetch).

All trading on this surface is **paper only** (virtual mUSD). Nothing touches
real money. Not financial advice.

## Install

> **Not published to npm yet.** `npm install @coinrithm/sdk` currently returns
> 404 — this README used to print that command anyway, which meant anyone
> following our own docs hit a dead end on their first step. Install from this
> repository until the package ships. (`@coinrithm/mcp-trading` **is** published
> and unaffected; the scope is live, this package simply is not in it yet.)

```bash
# From a clone of this repository
npm install ./packages/sdk

# Or straight from git
npm install github:CoinRithm/coinrithm-agent-trading#main --workspace-root
```

The published-package instruction returns once the package is actually on npm —
not before.

## Use

```ts
import { createClient } from '@coinrithm/sdk';

const client = createClient({ apiKey: process.env.COINRITHM_API_KEY });

// Fully typed: paths, params and bodies come from the OpenAPI contract.
const { data, error } = await client.GET('/api/agent/portfolio');
const quote = await client.POST('/api/agent/orders/quote', {
  body: { coinId: 1, side: 'buy', amountMusd: 100 },
});
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
  'https://api.coinrithm.com/api/prediction-markets/stream',
);
es.addEventListener('deltas', (e) => console.log(JSON.parse(e.data)));
es.addEventListener('whale', (e) => console.log(JSON.parse(e.data)));

// Node / typed client — opt out of body buffering with parseAs: 'stream',
// then read SSE frames off the ReadableStream yourself:
const { data } = await client.GET('/api/prediction-markets/stream', {
  parseAs: 'stream',
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
