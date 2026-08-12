# CoinRithm API pricing — decision record

**Status: DECIDED (engineering + commercial), NOT YET PUBLISHED.**
Owner delegated this decision to the agent pair (Claude + GPT-5.6) on 2026-08-12
with the instruction: research it, do not guess, do not over- or under-price.
This file is the coordination artifact. Disagree by editing it in a commit.

Research base: 4 parallel research lanes + 3 adversarial reviewers (overpriced /
underpriced / licensing), workflow `wf_297d062b-2ae`, all figures first-source
and read 2026-08-12.

---

## 1. What the market already decided

Three independent prediction-market data vendors converged on the same numbers
without collusion — this is a Schelling point, not a coincidence, and inventing
our own number would be the mistake:

| Vendor | Free | Entry | Pro |
|---|---|---|---|
| Prediction Hunt | 1,000 req/mo | **$49** | **$249** |
| Predexon | 1,000 req/mo | **$49** | **$249** |
| Adjacent (adj.news) | 15-min delayed | **$50** | **$250** |
| PMXT | 25,000 credits | $29.99 | $99.99 |
| PropheSeer (3 venues only) | 100/day | $19.99 | — |
| CoinGecko | 10,000 credits | $35 ($29 annual) | $129 |
| CoinMarketCap | 15,000 credits | $29 | $79 |

Two facts that bound us from below and above:

- **Polymarket's own read API is free and keyless.** Single-venue data has a $0
  floor. Our pricing power is *only* in the cross-venue layer: canonical Event
  ID, consensus probability, divergence, resolution provenance, coverage ledger.
- **Every vendor above $250 hides the price behind a form.** We have no sales
  motion, so anything we print must clear self-serve without a call.

## 2. Tiers

**PUBLIC (keyless) — $0, permanent**
60 req/min per IP (this is the existing `apiLimiter`, already live — documenting
it throttles nobody). No published monthly cap. All currently-public endpoints,
**live, not delayed**, at today's depth. Attribution required. Non-commercial.
Enforcement is 429 + `Retry-After` only — never a ban, never a bill.

**FREE (keyed) — $0**
250,000 req/month · 120 req/min · 20 trade-writes/min · 30 days history · 1 key.
Hard cap, no card on file, so it is structurally incapable of generating a bill.
Non-commercial — commercial use requires Builder at ANY volume, which is the
real conversion lever, not the quota.

**BUILDER — $29/month** ($278/yr)
1M req/month · 300 req/min · **commercial licence** · 1 year history + `asOf`
point-in-time replay · 5 keys.

**PRO — $149/month** ($1,430/yr)
5M req/month · 600 req/min · full history since inception · resolution-provenance
corpus as a queryable API · event revision lineage · bounded export of
CoinRithm-authored fields.

**ENTERPRISE — no price printed.** Quote from a $2,500/mo internal floor.
**Model-training rights are not sold at any price, to anyone, ever** — they are
not ours to sell (see §5).

### Why these numbers and not the obvious alternatives

- **$29 entry, not $19.** Seven independently verified pricing pages put the
  first paid step at $29–$49. Below $19 signals hobby project. Builder is not a
  bare permission slip — it carries 1-year history + `asOf`, which is real value
  we already own.
- **$149 mid, not $99 and not $399.** $99 exits the segment: PredictionData.dev
  charges $450/mo for *Polymarket-only* onchain history; Amberdata charges $600/mo
  for one exchange feed. But $399 self-serve from an unknown vendor on one box
  with no SLA history invites diligence we cannot pass today. $149 is a 5.1x
  price step for a 5x volume step and undercuts every direct competitor's $249.
- **No $999 tier printed.** Printing an enterprise number next to a $0 keyless
  tier invites SLA/DPA/DR questions with near-zero expected value.
- **Free keyed at 250,000 — RAISED from 100,000 by the binding rule, which
  fired.** The rule said: publish only after the per-key p99 probe, and if p99
  exceeds 100k, raise the quota rather than throttle real users.

  PROBE (prod, 2026-08-12, 90 days of AgentActionEvent per key per month; this
  is a FLOOR — actions <= requests, since reads do not all emit an action):
  ```
  67 key-months over 37 distinct keys
  p10       76     p25   32,720     p50  105,702
  p75  280,745     p95  563,676     p99  995,437
  <=100k: 29/67 (43%)   <=250k: 48/67 (72%)   <=1M: 67/67 (100%)
  ```
  100,000 would have throttled 57% of real key-months — the MEDIAN key already
  exceeds it. The critique that argued 250k "eats the product" reasoned from a
  mean of ~225-240k, but mean is the wrong statistic for quota sizing: it is
  dragged by a few heavy keys. p50 is 105k and p75 is 281k.

  250,000 fits a genuine single agent (p75) while staying 4x below Builder's 1M,
  so scale is still a real upgrade trigger. Conversion is driven by the
  COMMERCIAL LICENCE, which Builder gates at any volume — not by starving the
  free tier. This product's users run autonomous agents that poll continuously;
  comparables like CoinGecko's 10k and CMC's 15k are sized for humans checking
  prices, and copying them here would make the free tier useless for the actual
  use case.
- **No overage billing at launch.** `apiKeyUsage.ts` says in its own header that
  it is fire-and-forget Redis INCR that degrades to null and can never reject a
  request. You cannot invoice off that. Over quota → throttle to free rate.
  Overage only after a durable Postgres meter exists.
- **Trade-writes stay 20/min at every tier, including Enterprise, and are never
  sold.** Read limits are a product axis; write limits are an integrity control
  in a leaderboard product.

**Honest revenue expectation: near zero for 12 months from the existing 28
users.** Every dollar comes from users who do not exist yet. The job of this card
is a defensible anchor and a commercial licence — not extraction.

## 3. The free tier survives. This is the whole strategy.

The case studies are unambiguous, and the variable that predicts damage is **not
notice length** — it is whether the free tier survived:

| | outcome |
|---|---|
| Heroku — deleted it (95 days notice) | reputationally destroyed |
| Twitter — cut to 1,500 reads/mo | catastrophic |
| Reddit — priced third-party clients out | catastrophic |
| Docker — kept 100/200 pulls (90 days notice) | fine, twice |
| Google Maps — kept $200 perpetual credit | fine |

We currently advertise *"Free, keyless JSON endpoints … free to use with
attribution."* **We do not retract that.** We add a paid layer above it. Nothing
that is free today becomes paid.

**Founding Developer** — every key existing before announcement (today: 28 users
/ 47 keys): 1M req/month indefinitely, commercial use of the derived layer free
for 12 months, then $29 Builder. Non-transferable, bound to the account. Covers
today's endpoint surface, not future premium endpoints (Algolia's mechanic).
A *perpetual* commercial grant was rejected: venue agreements get amended, and a
perpetual promise would force us to breach either the venue agreement or our own
public word.

## 4. Wording changes

Only **3 keys** become inaccurate, all on the API docs page
(`pages.prediction_markets.api.{head_title,head_description,subtitle}`). They need
*additions* naming the paid tiers, **not retractions** — the keyless endpoints
stay free, so the sentences stay true.

The other ~106 "free" strings are the consumer paper-trading product and remain
honest: paper trading, portfolio, watchlist and "start free account" are not
being monetised.

`stats.cite_body` / `compare_pvk.cite_body` ("these figures are free to use in
news articles, research, and AI-generated answers") **stay free deliberately** —
that is the GEO/citation strategy, which `CLAUDE.md` ranks above cost.

## 5. Licence guardrails — non-negotiable

Venue agreements (Kalshi Institutional, Crypto.com MDLA) permit paid API and
subscription products. They forbid paid ranking placement and venue
revenue-share. They forbid training on Licensed Data.

- **Sell the derived layer**, not raw venue feeds. Canonical Event ID, consensus
  probability, divergence, resolution provenance, coverage ledger, `asOf`.
- **The no-training restriction must pass through** to every paying customer.
  It already does in the README and OpenAPI Acceptable Use text.
- **Resolve the contradiction before selling bulk exports.** Terms clause (b)
  currently forbids customers from bulk-extracting. Selling a bulk export SKU
  contradicts our own terms unless paid customers get an explicit carve-out
  under a separate data agreement. Do not ship the SKU before the carve-out.

### Two live exposures found and fixed while writing this

1. **`openapi.yaml` declared `license: MIT` on the API itself.** In OpenAPI,
   `info.license` describes the API being served, not the spec file — so the
   document simultaneously forbade resale in prose and granted the right to
   "use, copy, modify, sublicense, and sell" in the machine-readable field a
   lawyer would actually cite. Replaced with CoinRithm Terms of Use. The MIT
   LICENSE file is correct and unchanged: it covers the SDK/MCP **client code**,
   which stays open source. MIT on the client is *pro*-monetisation — Stripe,
   OpenAI and Supabase all do exactly this.
2. **`/api/arena/decisions` was commented "research/fine-tuning".** That invited
   precisely what the venue agreements forbid. Corrected.

### Still open (decide before publishing the card)

`/api/arena/decisions` is keyless, cursor-paginated, 250 rows/request with
`hasMore: true` — the full dataset is walkable, and `entryContext` carries raw
venue order-book fields (`bestBid`, `bestAsk`, `spread`, `liquidity`). That is
both a redistribution-clause exposure and a leak of the derived history Pro is
meant to sell. Recommended: keep the dataset keyless and permanent (it is the
citation asset — deleting it is the Heroku mistake), but move `entryContext`
behind a key. Breaking change; sequence it with the tier launch, not before.

## 6. What the owner must provide

**Merchant of record — Paddle or Lemon Squeezy, not raw Stripe.** BeesX Ltd is
Ireland-based selling B2B/B2C software internationally. A merchant of record
becomes the seller of record and handles EU VAT/OSS registration, filing and
invoice compliance. Raw Stripe leaves VAT registration, rate determination and
filing on the company. That single choice determines the paperwork:

- Company legal name, registered address, company number (BeesX Ltd)
- VAT number if registered; if not, the MoR route avoids needing one immediately
- Bank account for payouts (IBAN/BIC)
- A director ID for KYC
- Support email that appears on customer invoices

Nothing else is needed from the owner until the card is published.

## 7. Sequence — nothing in the last step ships before the ones above it

1. ~~Remove `license: MIT` from the OpenAPI specs~~ **DONE**
2. ~~Remove "fine-tuning" wording from the decisions dataset~~ **DONE**
3. Per-venue rights matrix (12 venues): what may be resold, per agreement
4. Draft API Terms with the derived-vs-raw boundary + bulk carve-out
5. Durable Postgres monthly usage rollup (the Redis counter cannot be invoiced off)
6. ~~Per-key p99 probe → confirm or raise the free quota~~ **DONE — quota
   raised 100k → 250k on the evidence above**
7. Email the 28 existing users individually; grant Founding Developer
8. Open the Paddle account
9. Publish the card: 90 days notice, 60 days soft enforcement

Steps 1, 2 and 7 are worth doing even if pricing never ships.
