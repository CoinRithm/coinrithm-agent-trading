# @coinrithm/sdk

Typed TypeScript client for the **CoinRithm Agent Trading API**, generated
from this repository's OpenAPI 3.1 contract (`openapi.yaml`). Every path,
parameter and response body is checked against the contract at compile time
via [`openapi-typescript`](https://github.com/openapi-ts/openapi-typescript) +
[`openapi-fetch`](https://github.com/openapi-ts/openapi-typescript/tree/main/packages/openapi-fetch).

All trading on this surface is **paper only** (virtual mUSD). Nothing touches
real money. Not financial advice.

## 0.4.0

Released on 2026-10-13, generated from API contract **1.8.0**.

- **Keyless public market data** (`public-market-data`): the TradFi reference
  catalog and detail (equities, ETFs, metals, commodities, FX) with the
  near-real-time `live` overlay, large perpetual-futures trades, 24-hour
  liquidations, CFTC positioning, SEC Form 4 insider filings and public-company
  crypto treasuries. See [Public market data](#public-market-data). Errors on
  these routes are `{ message }` bodies (`PublicMessageError`), not `{ error }`.
- **Agent operations** already served by the API: `/api/agent/universe` and
  `/universe/sectors` (market-boundary screener), `/api/agent/spot/reference/{coinId}`
  (dated spot reference), and the house-agent `pm_paper_v2` lifecycle under
  `/api/agent/pm/v2/*`. PM v2 opens from an API key must send
  `forecastProbability` (422 `forecast_required` otherwise) and are refused with
  `entry_forecast_not_above_cost` when the forecast does not beat the
  fee-inclusive cost.
- **New optional parameters**: `minUsd` tiers on `/whales`; `view`, `lead`,
  `dedupe`, `minVolume24h` and `includeQuoteEvidence` on `/events`; `view`,
  `full`, `lang` and `includeQuoteEvidence` on event detail;
  `outcomeExternalMarketId` on the order book; `view` and
  `maxEndDateDifferenceDays` on `/matches/public`; candle range `1Y`.
- **New response fields**: whale wallet, trader and event fields plus typed
  `stats24h`; paused-venue `availability`, `quoteEvidence` and `outcomesTotal`
  on events; order-book `receivedAt` and `sideEvidence`; calibration
  `methodologyVersion`, `finalPrice` and `ownCapture`; wallet `enrichment`;
  `/api/agent/me` `usage`; price freshness on top gainers and losers.
- **Corrections that can affect typed callers**: whale `outcome` is
  `string | null`; portfolio `pnl.allTimeUsd` and `allTimePct` can be `null`;
  `/events` pagination carries `hasMore` (the never-sent `total` is deprecated).
  `AgentLedgerExport.futures`/`futuresEvents` and `PmOpportunityResponse.thesis`
  were never returned and are now marked deprecated.

The TypeScript runtime wrapper and its dependencies are unchanged from 0.3.5.
See the [changelog](./CHANGELOG.md).

## 0.3.5

Published on npm and verified on 2026-10-07. This version adds optional typed
market context for price timing, funding, open interest, positioning, captured
liquidations, observed depth, macro derivative proxies and DeFi. Each source
retains its own coverage, freshness and nullability; response time does not make
all inputs fresh. Depth is one venue's observed 20-level book, and associated
chain TVL is not the coin's market value.

`derivatives.fundingByVenue` preserves independently collected settlement-reference
and Hyperliquid context rates. `rateFraction` is a fraction per `intervalHours`;
`hourlyEquivalentFraction` is simple normalization, not APR or expected return.
Unknown intervals/times remain null, `sourceAt` is null and `sameTime` is false.
The existing top-level funding reference and entry rules are unchanged.

PM discovery/positions also gain optional `relatedCoins`, with `eventEndDate` on
positions. Treat omitted metadata and implausible venue dates as unknown. These
are additive API contract 1.7.0 types; the runtime wrapper is unchanged. See the
[changelog](./CHANGELOG.md) and
[release status](https://github.com/CoinRithm/coinrithm-agent-trading#version-clarity).

## 0.3.4

- Adds optional `representativeOutcome` (a full `PublicPmOutcome`, or `null`)
  and `representativeOutcomeBasis` (`threshold_ladder_line` or
  `informative_leader`) to prediction-market events. Both are served on open
  events only: on event detail, and on compact lists requested with
  `lead=representative`. `informative_leader` is not necessarily the leading
  outcome.
- Adds canonical-question `consensus` (the current cross-venue reference:
  kind, outcomeName, probability, venueCount, spreadPoints, computedAt,
  methodologyVersion and listings, or `null`) and `consensusHistory` (a daily
  tape in which every point carries its own outcome label). `listings` may be a
  subset of the contributing venues.
- Types the optional per-outcome `hasObservedPrice` flag and nullable
  `sourceObservation` provenance.
- Adds public resolved/surprise/expiring, order-book and trade endpoint types;
  event subtitles, price basis, per-outcome settlement rules, informational
  futures-entry eligibility, spot `priceTiming` and fill/replay evidence.
- Corrects price-history types to one outcome's `points` over a lookback
  interval and preserves nullable spot replay fields. These describe existing
  responses; typed callers may need adjustments. Most other fields are optional
  additions. Generated from API contract 1.7.0; strict enum additions still
  require a matching SDK release. See the [changelog](./CHANGELOG.md).

## 0.3.3

- PM quote and open requests accept optional `minEntryProbabilityPct`, a
  chosen-side entry probability floor in percentage points before fees. It is
  omitted by default; `0` is a valid explicit value. Generated from the
  unchanged API contract 1.7.0.

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
This package documents version **0.4.0**. See the
[release status](https://github.com/CoinRithm/coinrithm-agent-trading#version-clarity)
for registry availability.
Check `npm view @coinrithm/sdk version` for
the latest published version. The package version is independent of the
OpenAPI contract version, which is **1.8.0**.

Candle `v` is a mean rolling 24-hour quote-volume observation in USD, not
per-candle traded volume. Do not sum it across bars or difference bars as
interval turnover. Prediction market outcome names are display labels that may
be enriched; retain source, event and outcome identifiers instead of treating
matching names as identity.

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

## Public market data

Keyless reads under `/api/market/*`, generated from the `public-market-data`
contract group. They need no API key. Each response names its source; keep the
CoinGecko attribution next to any display of treasury data.

| Path | What it returns |
| --- | --- |
| `GET /api/market/references` | Every TradFi reference instrument with its latest validated consensus, 24h/7d change, 24h range, 7-day sparkline and `live` overlay |
| `GET /api/market/references/{ticker}` | One reference with venue constituents and 15-minute history (`window` `24h` or `7d`) |
| `GET /api/market/references/{ticker}/treasury` | The listed company's BTC/ETH/SOL/BNB holdings, or `treasury: null` |
| `GET /api/market/references/{ticker}/filings` | SEC Form 4 insider and open-market transactions with filing links |
| `GET /api/market/references/{ticker}/positioning` | Weekly CFTC Commitments of Traders for references with a US futures equivalent |
| `GET /api/market/treasuries/{coin}` | Public companies holding `bitcoin`, `ethereum`, `solana` or `binancecoin` |
| `GET /api/market/large-trades` | Large Binance USD-M and Hyperliquid perpetual prints, newest first |
| `GET /api/market/liquidations` | Last-24h liquidation totals and the biggest/latest events for one base |

```ts
const market = createClient();

const catalog = await market.GET("/api/market/references");
const gold = await market.GET("/api/market/references/{ticker}", {
  params: { path: { ticker: "XAU" }, query: { window: "7d" } },
});
const holdings = await market.GET("/api/market/references/{ticker}/treasury", {
  params: { path: { ticker: "MSTR" } },
});
const filings = await market.GET("/api/market/references/{ticker}/filings", {
  params: { path: { ticker: "HOOD" } },
});
const cot = await market.GET("/api/market/references/{ticker}/positioning", {
  params: { path: { ticker: "XAU" } },
});
const btcTreasuries = await market.GET("/api/market/treasuries/{coin}", {
  params: { path: { coin: "bitcoin" } },
});
const prints = await market.GET("/api/market/large-trades", {
  params: { query: { assetClass: "equity", limit: 20 } },
});
const liquidations = await market.GET("/api/market/liquidations", {
  params: { query: { base: "BTC" } },
});
```

What to keep in mind:

- A reference price is the median of 2-3 derivatives-venue index prices in
  USDT, not an exchange last trade. `live` is null whenever the overlay is off,
  invalid or older than `methodology.liveMaxAgeSeconds`; `latest` and the
  derived fields never depend on it.
- Large trades and liquidations cover only what CoinRithm's collectors saw while
  connected. An empty list or a zero total is not proof that nothing happened,
  and liquidation `capturedPct` measures capture uptime, not exchange
  completeness.
- Filings `coverage` is `not_applicable` for instruments that do not file
  Form 4 and `none_recorded` before the first collected transaction. Treasury
  and positioning reads report `status` (`fresh`, `stale` or `unavailable`) and
  still answer 200 when the upstream source fails.
- Errors are `{ message }` bodies: 400 for an invalid or unknown query
  parameter, 404 for a ticker outside the catalog or an unsupported coin.

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
