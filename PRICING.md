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

### 3. `/api/arena/decisions` republished venue order books — CLOSED, and this file's earlier recommendation was wrong

The exposure was real: keyless, cursor-paginated, 250 rows/request with
`hasMore: true` and a JSONL bulk mode, and `entryContext` carried raw venue
order-book fields (`bestBid`, `bestAsk`, `spread`, `liquidity`, `volume24h`).

**This file previously recommended moving `entryContext` behind a key, sequenced
with the tier launch. That fix does not work, and the per-venue rights research
is what showed it.** Kalshi's Data Terms of Use prohibit *"providing archived or
cached datasets containing Kalshi Data to another person or entity"* — a paying,
authenticated customer is still another person or entity. Authentication would
have closed the competitive leak while leaving the licensing breach fully intact,
and it would have shipped later, under a tier launch, with a false sense that the
problem was handled.

Shipped instead: a venue rights registry (`backend-v2/src/lib/venueDataRights.ts`)
carrying each venue's verbatim clause, source URL and retrieval date, which the
dataset layer consults before emitting venue market data. The five order-book
fields are withheld; everything CoinRithm computed or transacted at survives. The
dataset stays keyless and permanent — it is the citation asset, and deleting it
would be the Heroku mistake.

Two details that make the fix honest rather than merely quiet:

- A redacted snapshot carries `marketDataRedacted: true`. This dataset's standing
  contract is that a null means "honestly unknown, never inferred"; nulling five
  fields silently would have told every consumer they were never captured, which
  is false. The marker is what keeps the null true.
- The single-artifact endpoint (`/decisions/:uuid`) is deliberately NOT redacted:
  `decisionContext` sits inside `ARTIFACT_FIELDS_V1`, so redacting it would break
  every published truth receipt's hash verification. One decision behind an opaque
  uuid is a citation; a cursor-walkable feed is the "archived or cached dataset"
  the clauses name. Walking uuids to reconstruct is possible in principle and
  per-key metering is the control — a boundary counsel should confirm.

### Per-venue rights matrix — the finding that reframes Queue 2

Terms read live 2026-08-12 for all twelve venues. **Not one affirmatively grants
redistribution of its market data.** Five expressly prohibit it absent written
permission; seven could not be read in full and are recorded as `unverified`,
which the gate treats exactly like prohibited.

| Venue | Redistribution | Basis |
|---|---|---|
| Kalshi | prohibited | Data ToS §I: personal, non-commercial; expressly excludes "providing archived or cached datasets containing Kalshi Data to another person or entity" |
| Futuur | prohibited | "resell, transfer or make commercial use of … bets, markets or associated metadata" barred absent written permission |
| Manifold | prohibited | Content licensed for "personal, non-commercial use"; no use "for any revenue-generating endeavor" |
| Metaculus | prohibited | Bars automated access outright, not merely resale |
| Limitless | prohibited | No copy/distribute/license/sell of Platform Content without prior written permission |
| Polymarket, Gemini, Myriad, Smarkets, PredictIt, ForecastEx, Rothera | unverified | Client-rendered pages, per-state agreements, PDFs, or 403 to automated retrieval |

**This is not a setback — it is the argument for the moat the charter already
wants.** Venue prices are borrowed; canonical Event IDs, cross-venue matching,
consensus probability, calibration, corrections and coverage ledgers are facts
CoinRithm computed and owns outright. The rights research did not narrow the
product, it identified which layer was ever really sellable.

Three consequences for the tier card:

1. **Pro's "resolution-provenance corpus" and any bulk export must be scoped to
   CoinRithm-authored fields.** Already the stated intent in §5; now it is a hard
   boundary rather than a preference.
2. **Kalshi's approval is an INGESTION licence, not a redistribution licence.**
   The 2026-07-28 approval was scoped to evaluation-only / no-training / neutral
   comparison. Selling Kalshi market data needs a separate written grant. An API
   key grants access; it does not grant the right to republish.
3. **Limitless is the cheapest entry to move to `cleared`** — an active partner
   relationship with an open devrel channel makes written permission genuinely
   obtainable. A friendly Telegram group is not prior written permission. Ask.

### Still open (decide before publishing the card)

- Read the seven `unverified` venues' terms and replace the placeholders. Two
  need a human: Myriad 403s automated retrieval, Rothera's terms are in
  participant-agreement PDFs.
- Counsel sign-off on the derived-vs-raw boundary and on the single-artifact
  carve-out above.
- **Clause (b) now has a proposed resolution — see `API_TERMS.md` (DRAFT).**
  The fix is to stop treating "Market Data" as one undifferentiated thing. The
  bulk-extraction bar applies to **Venue Market Data**; bulk export of
  **CoinRithm Data** is what the paid tier licenses. Same sentence, two layers,
  contradiction gone.

  Two things that draft changes about how Pro must be built, not just worded:

  1. **"We derived it" does not exit a licence.** Gemini's API Agreement
     expressly contemplates "Gemini Market Data or Derived Data" reaching third
     parties under dedicated agreements. The defensible claim is not that we
     transformed a venue's numbers but that CoinRithm Data answers questions no
     venue asked, computed over clusters CoinRithm defined.
  2. **The operative test is invertibility.** If a customer could reconstruct a
     venue's order book from the export, we sold the venue's order book. That is
     a constraint on how the bulk-export SKU is BUILT, not on how it is
     described. Design it lossy with respect to any single venue's feed.

  Still gated on counsel; do not ship the SKU before sign-off.

- **A false statement was live in `openapi.yaml` and is now corrected.** The
  Acceptable Use block asserted that venue Market Data "is licensed to CoinRithm
  by those venues." It is not — zero of twelve grant redistribution. That was the
  single worst sentence in the document, because it is the one a venue's counsel
  would quote back. Replaced with the honest position: we pass through a right to
  read, we do not represent that we hold redistribution rights, and anyone who
  needs them should go to the venue.

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
