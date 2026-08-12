# CoinRithm API Terms — DRAFT, NOT PUBLISHED

**Status: DRAFT for counsel review. Nothing here is in force.**
The published terms remain those at https://www.coinrithm.com/en/terms-of-use.
This document exists so the boundary is written down precisely before anything
is sold, and so counsel reviews a concrete proposal rather than a question.

Written 2026-08-12 against the per-venue rights research recorded in
`backend-v2/src/lib/venueDataRights.ts` (eleven of twelve venues' terms read
live; standing: 8 prohibited, 1 silent, 3 unverified, 0 cleared).

---

## 1. Why the current wording has to change

The Acceptable Use block served in `openapi.yaml` today has three problems, in
descending order of seriousness.

**(a) It states something untrue.** It says Market Data "is licensed to
CoinRithm by those venues." It is not. Not one of the twelve venues has granted
CoinRithm redistribution rights. Kalshi approved an ingestion application scoped
to evaluation and neutral comparison; Limitless is a partner without a written
data grant; the rest range from expressly prohibited to unread. A public
contract asserting a licence we do not hold is the single worst sentence in the
document, because it is the one a venue's counsel would quote back.

**(b) It forbids the thing we intend to sell.** Clause (b) bars customers from
"bulk-extract"ing Market Data, while Queue 2 plans a paid bulk historical
export. As written, our own terms prohibit our own roadmap.

**(c) It gives away our own work by omission.** "Market Data" is defined so
broadly that it swallows the things CoinRithm actually created — canonical event
identity, cross-venue matching, consensus probability, calibration scoring,
coverage ledgers. The terms then forbid redistributing all of it. So the
document simultaneously over-claims rights we do not have over venue data, and
under-claims the one asset we do own outright. Both errors point the same way:
the two layers were never distinguished.

## 2. The fix: two layers, named separately

### Venue Market Data

Prices, probabilities, order books, quotes, volumes, open interest, venue event
and market metadata, and venue-reported settlement outcomes, as published by the
third-party venue.

**This is not ours.** CoinRithm accesses it under each venue's own terms and
passes through a limited right to read it. Customers may read it to make and
evaluate decisions. Customers may not redistribute, resell, sublicense, bulk
extract, or train on it. CoinRithm does not warrant that it holds redistribution
rights in it, because in general it does not.

The honest framing for a customer is: *we can show you this; we cannot give it
to you.* Anyone who needs redistribution rights in a venue's raw feed must get
them from that venue.

### CoinRithm Data

Facts CoinRithm created. Not "venue data we transformed" — **outputs of our own
methodology, identity system, and measurement**:

- Canonical **CoinRithm Event ID** and the cross-venue cluster it names
- Cross-venue **matching and orientation** decisions
- **Consensus / reference probability** and its versioned methodology
- **Calibration and Brier scoring**, and the evaluation policy version
- **Coverage ledger**, completeness classifications, and universe-verification results
- **Corrections and revision lineage**
- **Resolution provenance** classifications (venue-reported vs observed vs derived)
- **Decision artifacts**: decision UUIDs, content hashes, attestations, signatures
- CoinRithm's own **paper-trading records** and their execution-policy versions

**This is ours**, and it is the layer that paid tiers license — including, at the
appropriate tier, redistribution and bulk export.

## 3. The distinction that has to hold up, and its limit

The instinct to write "derived data is ours" is wrong, and the research caught
it. **Gemini's API Agreement expressly contemplates "Gemini Market Data or
Derived Data" reaching third parties under dedicated agreements.** At least one
venue treats derived output as *inside* its market-data licence. "We derived it"
is therefore not a phrase that exits a licence, and terms resting on it would
rest on sand.

The defensible line is narrower and stronger:

> CoinRithm Data is not a transformation of any single venue's feed. It is the
> product of CoinRithm's own identity system, methodology, and measurement,
> applied across venues. A consensus probability is not Kalshi's price scaled;
> it is an answer to a question no venue asked, computed from a cluster CoinRithm
> defined.

Two consequences follow, and both should survive review:

1. **Anything traceable to one venue's numbers stays Venue Market Data**, no
   matter how much arithmetic is applied. A single venue's price rounded,
   smoothed, or delayed is still that venue's price.
2. **Aggregates that cannot be inverted to recover a venue's feed are CoinRithm
   Data.** If a customer could reconstruct a venue's order book from what we
   sold them, we sold the venue's order book.

Point 2 is the operative test for the bulk-export SKU, and it is a *design*
constraint, not a drafting one: the export must not be a lossless re-encoding of
venue prices.

## 4. Clause (b), resolved

Replace the flat bulk-extraction bar with a layered one:

> You may not redistribute, resell, sublicense, or bulk extract **Venue Market
> Data**. Rights to bulk export **CoinRithm Data** are granted by tier and are
> described in your plan.

That removes the contradiction without loosening anything that protects a venue.

## 5. What stays exactly as it is

- **No model training on Venue Market Data**, and the restriction passes through
  to every customer. This is a commitment CoinRithm made in writing to Kalshi and
  it is not ours to relax at any price.
- **No paid ranking placement, no venue revenue-share.** Rankings stay organic.
- **The keyless public endpoints stay free.** Nothing free today becomes paid.
  Adding a paid layer above is not a retraction; deleting the free layer would be.

## 6. Open for counsel

1. **The §3 line itself** — is "not invertible to a venue's feed" a test that
   holds, and is the Gemini "Derived Data" definition narrower or broader than
   assumed?
2. **The single-artifact carve-out.** `/api/arena/decisions/:uuid` serves an
   unredacted decision snapshot because `decisionContext` is inside the hashed
   field list and redacting it would break every published truth receipt. One
   decision behind an opaque UUID is a citation; a cursor-walkable feed is the
   "archived or cached dataset" venue clauses name. Walking UUIDs to reconstruct
   is possible in principle; per-key metering is the control. Confirm or reject.
3. **Smarkets is an access question, not a redistribution one.** Its terms permit
   automated interaction only after a completed API Request Form and approval,
   and name "odds scraping" as prohibited. We read `api.smarkets.com/v3`. This
   needs an owner decision — complete the form or stop ingesting — and it should
   not be resolved by editing terms.
4. **Whether to represent anything at all about venue rights to customers.**
   Saying nothing may be safer than the current false assurance; saying "we hold
   no redistribution rights in venue data" is honest but invites the question of
   what we do hold. Recommend the honest version.

## 7. Sequence before anything is published

1. Counsel review of §2, §3, §4.
2. Correct the false licensing sentence in `openapi.yaml` — this one should not
   wait for the rest, because it is a factual error in a live document.
3. Move at least one venue to `cleared` (Limitless and Myriad are the cheapest —
   an open partner channel, and terms with no data clause to negotiate around).
4. Founding-cohort notice, then tier publication, then enforcement.
