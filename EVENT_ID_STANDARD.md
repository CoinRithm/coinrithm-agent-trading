# CoinRithm Event ID — specification v1

**Status: v1, describing behaviour shipped and verified in production 2026-08-12.**
Every guarantee below was checked against the writer
(`backend-v2-aggregator/.../aggregatePredictionMarkets/canonicalEvents.ts`), the
reader (`backend-v2/src/controllers/predictionMarkets/canonicalEvents.ts`), and
live responses. Where something is code-verified but not yet observable in live
data, this document says so rather than implying it was measured.

---

## 1. The problem it solves

The same real-world question is listed by many venues under different slugs,
different titles, and sometimes with the outcome stated backwards. Polymarket's
`atp-landalu-draper-2026-08-13` and Limitless's
`martin-landaluce-vs-jack-draper-1786530228494` are one question. Nothing in
either venue's data says so.

Anyone comparing prediction markets has to solve this, and everyone solves it
privately and differently, so no two analyses are comparable. A **CoinRithm
Event ID** is a stable public name for that one real-world question, independent
of any venue, together with the evidence for why those listings were judged the
same.

## 2. The identifier

Every canonical event carries two keys:

| Key | Example | Stable? |
|---|---|---|
| `uuid` | `1953ff97-850c-4467-b3d0-ff01e4bb7a0b` | **Permanent.** Minted once, never rewritten. |
| `slug` | `cincinnati-open-martin-landaluce-vs-jack-draper-1953ff97` | **Permanent.** Slugified title + first 8 uuid chars, fixed at creation. |

**Cite the `uuid`.** The slug is human-readable and also permanent, but it
embeds a title snapshot (see §4) and is longer; the uuid is the canonical form.

Recommended citation prefix when embedding in other systems: `crid:<uuid>` —
e.g. `crid:1953ff97-850c-4467-b3d0-ff01e4bb7a0b`. The prefix is a convention for
readers, not part of the identifier; the API accepts the bare uuid or slug.

## 3. Resolution

Both endpoints are **keyless**, no authentication:

```
GET https://api.coinrithm.com/api/prediction-markets/canonical          # directory
GET https://api.coinrithm.com/api/prediction-markets/canonical/{uuid|slug}
```

The detail response returns `canonical`, `mergedInto`, `members[]` and
`lineage[]`. A worked example is in §7.

## 4. Stability contract

What is guaranteed, and the code that guarantees it:

1. **A uuid is never reused and never rewritten.** It is assigned by
   `randomUUID()` at creation. No `UPDATE` statement in the writer touches
   `uuid` or `slug` — the only mutated columns are `memberCount`, `status`,
   `mergedIntoId`, `revision`, `anchorEventId` and `updatedAt`.
2. **A key never 404s once issued, including after a merge.** Merging sets
   `status='merged'` and a `mergedIntoId` pointer, zeroes `memberCount` and
   bumps `revision`; **the row is never deleted**. The reader serves merged
   canonicals with a `mergedInto` pointer so a stored link keeps resolving and
   tells you where the identity moved.
   *Code-verified, not live-observed: the public directory lists only `active`
   canonicals, so a merged example cannot be sampled from it.*
3. **`revision` increases monotonically** and changes whenever membership,
   anchor or status changes. Use it for change detection.
4. **Membership is not stable, and is not meant to be.** Members are added and
   removed as venues list and delist. The identity is stable; its contents move.

What is **not** guaranteed, stated plainly because a standard that overpromises
is worse than none:

- **`title` is a snapshot, not a live field.** It is copied from the anchor
  listing at creation and never refreshed. If a venue later edits its title, the
  canonical title — and therefore the slug — keeps the original wording. Treat
  `title` as a label, and read `members[].eventTitle` for current venue wording.
- **`memberCount` becomes 0 on merge.** Follow `mergedInto` for live membership.
- **No stability promise across a `split`.** The lineage records splits; a split
  mints a new identity rather than mutating an existing one.

## 5. Field semantics

### `members[]`

| Field | Meaning |
|---|---|
| `source` / `sourceName` | Venue slug and display name. |
| `eventSlug` / `eventTitle` | The venue's own identifiers, as published by that venue. |
| `eventStatus` | The venue listing's status (`open`, `resolved`, …). |
| `isAnchor` | The reference member. The anchor is the lowest internal event id in the cluster; its title seeded the canonical title. |
| `orientation` | `same` \| `flipped` \| `unknown` — see below. |
| `confidence` | Match-edge confidence for this member, `0`–`1`. The anchor is `1` by definition. |
| `basis` | Provenance: `anchor` for the anchor, `match:<matchId>` for a member joined through a specific match edge. |

### `orientation` — the field to get right

- `same` — this listing's YES means the same thing as the anchor's YES.
- `flipped` — this listing is stated **backwards** relative to the anchor. Its
  probability must be read as `100 - p` before comparing.
- `unknown` — **not yet judged, and deliberately not guessed.**

Two rules that make this field trustworthy:

1. **Orientation is never inferred from price.** Two markets sitting at similar
   probabilities is not evidence they are aligned. Orientation is propagated
   only across match edges with a proven relationship; a cluster with missing or
   conflicting evidence stays `unknown`.
2. **`unknown` is a real answer, not a null.** It is served as-is. Do not
   collapse it to `same`; that is precisely the silent error this field exists to
   prevent.

> **Contract note.** Before 2026-08-12 the published OpenAPI enum declared
> `inverted` for this field, a value the system has never emitted. The correct
> value is `flipped`. If you generated a client from a spec dated earlier than
> that, regenerate it — the old union contains a member that cannot occur and
> omits the one that does.

### `lineage[]`

Append-only judgment log, newest first: `revision`, `action`
(`created`, `member_added`, `member_removed`, `orientation_changed`, …),
`eventId`, a structured `detail`, `judgedBy`, and `at`. It exists so a
third party can audit *why* two listings were called the same question, rather
than trusting that they were.

## 6. Adopting the standard

To map your own data onto CoinRithm Event IDs:

1. Resolve your venue listing to a canonical by walking the directory and
   matching on `members[].source` + `members[].eventSlug`.
2. **Store the `uuid`**, not the slug or the title.
3. Re-check on a cadence using `revision`; if it moved, re-read the detail.
4. If a stored uuid comes back `status='merged'`, follow `mergedInto` and update
   your stored key. Old links keep working, so this is never urgent.
5. Before comparing probabilities across members, apply `orientation` — and
   **skip `unknown` members rather than assuming alignment.**

## 7. Worked example

```
GET /api/prediction-markets/canonical/1953ff97-850c-4467-b3d0-ff01e4bb7a0b
```

```json
{
  "canonical": {
    "uuid": "1953ff97-850c-4467-b3d0-ff01e4bb7a0b",
    "slug": "cincinnati-open-martin-landaluce-vs-jack-draper-1953ff97",
    "title": "Cincinnati Open: Martin Landaluce vs Jack Draper",
    "revision": 1, "status": "active", "memberCount": 2
  },
  "mergedInto": null,
  "members": [
    { "source": "polymarket", "eventSlug": "atp-landalu-draper-2026-08-13",
      "isAnchor": true,  "orientation": "same",    "confidence": 1, "basis": "anchor" },
    { "source": "limitless", "eventSlug": "martin-landaluce-vs-jack-draper-1786530228494",
      "isAnchor": false, "orientation": "unknown", "confidence": 1, "basis": "match:53500" }
  ],
  "lineage": [ { "revision": 1, "action": "member_added", "judgedBy": "aggregator", "…": "…" } ]
}
```

Note the second member is `unknown`, not `same`. Two tennis markets with the
same two players still need proof of which side each YES refers to, and that
proof had not been established. That is the standard working correctly.

## 8. Embedding a card

Every canonical event renders as an SVG you can drop anywhere an image goes:

```html
<img
  src="https://api.coinrithm.com/api/prediction-markets/canonical/1953ff97-850c-4467-b3d0-ff01e4bb7a0b/card.svg"
  alt="CoinRithm consensus probability"
  width="480" height="200">
```

Markdown works too, which means READMEs and issue threads:

```markdown
![consensus](https://api.coinrithm.com/api/prediction-markets/canonical/<uuid>/card.svg)
```

It is an `<img>`, not an iframe or a script, so it survives a CMS that strips
scripts, a newsletter, and an RSS reader — and it asks you to trust no
JavaScript of ours. The card shows the question, the consensus probability, the
contributing venue count and the spread, and it stamps `crid:<first-8>` and the
methodology version into the corner so the number stays traceable to both the
question and the method.

Behaviour worth knowing before you rely on it:

- **It never breaks your page.** An unknown key renders an "Unknown market"
  card (with a 404 status); an internal error renders "Temporarily unavailable"
  with `no-store`. You will not get a broken-image icon.
- **No consensus is stated, not implied.** A question with no cross-venue
  number renders "No cross-venue consensus yet" rather than a dash that reads
  as zero.
- **Cached 5 minutes.** Long enough to absorb traffic, short enough not to be
  stale on a live question.

## 9. Coverage, honestly

Sampled 1,200 active canonicals from the live directory on 2026-08-12:

| Members | Canonicals |
|---|---|
| 2 | 967 |
| 3 | 201 |
| 4 | 27 |
| 5 | 5 |

All sampled canonicals were `active`. This is a **cross-venue cluster
directory**, so single-venue questions are not represented — a canonical exists
because at least two venues listed the same question.

## 9. Licensing

The identifier, the clustering judgment, the orientation determination, the
confidence, the basis and the lineage are **CoinRithm Data** — facts CoinRithm
created, and free to cite with attribution.

`members[].eventSlug` / `eventTitle` are the venues' own identifiers, reproduced
for mapping. Venue **market data** (prices, order books, volumes) is not part of
this standard and is not CoinRithm's to redistribute; see `API_TERMS.md`.

## 10. Versioning

This document is **v1**. The identifier format and the §4 stability guarantees
are the parts external systems depend on; they will not change incompatibly
within v1. Field additions are additive. Any change to §4 requires a version
bump and a migration note here.
