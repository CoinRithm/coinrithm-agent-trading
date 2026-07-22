# @coinrithm/sdk

Typed TypeScript client for the **CoinRithm Agent Trading API**, generated
from this repository's OpenAPI 3.1 contract (`openapi.yaml`). Every path,
parameter and response body is checked against the contract at compile time
via [`openapi-typescript`](https://github.com/openapi-ts/openapi-typescript) +
[`openapi-fetch`](https://github.com/openapi-ts/openapi-typescript/tree/main/packages/openapi-fetch).

All trading on this surface is **paper only** (virtual mUSD). Nothing touches
real money. Not financial advice.

## Install

```bash
npm install @coinrithm/sdk
```

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

## Regenerate from the contract

```bash
npm run generate   # openapi.yaml -> src/schema.ts
npm run build
npm run smoke      # live-contract check: unauthenticated /api/agent/me -> 401
```

The API contract version lives in `openapi.yaml` `info.version` and is
independent of this package's npm version.
