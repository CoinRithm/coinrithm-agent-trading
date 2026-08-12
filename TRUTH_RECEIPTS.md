# CoinRithm Truth Receipts — verification specification v1

**Status: v1. Every step below was executed against production on 2026-08-12
using only public, keyless endpoints — the same way a stranger would.**

A truth receipt lets a third party check that a published CoinRithm agent
decision has not been altered since it was made, without trusting CoinRithm.
That is the whole point: a leaderboard whose operator can silently rewrite
history is worth nothing, and "trust us" is not a moat.

---

## 1. What a receipt proves — and what it does not

**Proves:**

- The decision-defining fields have not changed since the decision was written.
  You recompute the hash yourself from the fields we serve.
- The hash was signed by the holder of a published key at attestation time
  (schemaVersion 3 rows only).

**Does NOT prove:**

- That the agent's forecast was good. A receipt is an integrity proof, not a
  quality claim.
- That the *self-reported* fields are true. `agentModel`, `promptHash`, runtime
  and bundle identifiers are supplied by the caller and hashed as supplied. A
  receipt proves nobody edited them afterwards, not that they were honest going
  in. `providerVerified` is server-computed and is `false` for every
  self-reported caller.
- Anything about rows without a signature. See §5 — most rows are unsigned, and
  the API says so per row rather than implying otherwise.

## 2. The three artefacts

| Endpoint | Gives you |
|---|---|
| `GET /api/arena/decisions/{decisionUuid}` | the receipt: `contentHash`, `contentHashFields`, `signature`, `signingKeyId`, `schemaVersion`, and every hashed field |
| `GET /api/arena/attestation-key` | the public key, its `keyId`, the `algorithm`, and the exact `signedMessageFormat` |
| `GET /api/arena/decisions` | the cursor-paged directory to find UUIDs |

All three are **keyless**.

## 3. Verification

### Step 1 — recompute the content hash

`contentHashFields` is the ordered list of fields the hash covers *for this
row's schemaVersion*. Project exactly those fields out of the response,
serialise as canonical JSON (keys sorted, no whitespace), and SHA-256 it.

```python
fields = artifact["contentHashFields"]
proj   = {k: artifact.get(k) for k in fields}
canon  = json.dumps(proj, sort_keys=True, separators=(",", ":"))
assert hashlib.sha256(canon.encode()).hexdigest() == artifact["contentHash"]
```

The field list is served *with the row* precisely so you never have to guess
which schema version it was written under.

### Step 2 — verify the signature (schemaVersion 3)

The signed message is **not** the bare hash. It is the format string published
by the key endpoint, with the hash substituted:

```
coinrithm-agent-decision:v3:<contentHash>
```

```python
msg = key["signedMessageFormat"].replace("<contentHash>", artifact["contentHash"]).encode()
Ed25519PublicKey.from_public_bytes(
    base64.b64decode(key["publicKeyBase64"])
).verify(base64.b64decode(artifact["signature"]), msg)
```

### Step 3 — check the key identity

Confirm `artifact.signingKeyId == key.keyId`. If they differ, the row was signed
by a key that is no longer current; the signature may still be valid under a
previous key, but you should not treat it as attested by the current one.

### Verified end-to-end, on production

Receipt `15916614-65e8-4701-8b54-cab4b2a641e4`, 2026-08-12:

```
schemaVersion       3
signingKeyId        a0b9b3becbf916c7   (== published keyId)
recomputed hash     349092d4c88522ac18b0cec28634df1c6569b4bba0e4eab20ff7361fdd670068
served contentHash  349092d4c88522ac18b0cec28634df1c6569b4bba0e4eab20ff7361fdd670068   MATCH
signature           VERIFIES against the published ed25519 key
```

## 4. Schema versions

The hashed field list grows by **appending only** — a version never reorders or
removes fields, so an older projection stays a strict prefix of a newer one.
The two still hash differently, because the canonical JSON of a later version
carries the extra keys.

| Version | Hashed fields | Signed |
|---|---|---|
| 1 | the decision-defining fields (including `decisionContext`) | no |
| 2 | v1 + `provenance` (what ran: policy versions, self-reported runtime/model/prompt hashes) | no |
| 3 | v2 + `attestation` (server-authoritative: when, which channel, which build) | **yes**, ed25519 |

`contentHash` covers **decision-time** fields only. The later settlement stamp
(`settlementLabel`, `settledAt`) is deliberately excluded, so the proof is fixed
at write time and does not change when the market resolves.

## 5. Coverage, stated honestly

Measured across the full public decision set on 2026-08-12 (539 decisions):

| schemaVersion | Decisions | Signed |
|---|---|---|
| 3 | 146 (27%) | yes |
| 2 | 263 (49%) | no |
| none (legacy) | 130 (24%) | no |

**Most published decisions are not signed.** Only decisions authenticated
through the internal channel become v3. Every row states its own
`schemaVersion`, `signature` and `signingKeyId`, and the API's `verified` flag
is a live server-side check rather than a stored boolean — so you can always
tell which tier a given row is in. Legacy rows are never back-filled: fabricating
a receipt for a decision that was not attested at the time would defeat the
purpose.

Treat `verified: true` as "CoinRithm attests this row"; treat `signature: null`
as "integrity-checkable via §3 step 1 only".

## 6. Why the redaction does not weaken this

The bulk feed `/api/arena/decisions` withholds venue order-book fields for
licensing reasons (see `API_TERMS.md`). The single-artifact endpoint does **not**
redact, because `decisionContext` is inside the hashed field list and redacting
it would break every published receipt.

So verification always runs against `/decisions/{uuid}`, and the bulk feed's
`marketDataRedacted` marker never appears in a hashed projection.

## 7. Licensing

Receipts — `decisionUuid`, `contentHash`, `attestation`, `signature`, the policy
versions and the evaluation outcome — are **CoinRithm Data**: facts CoinRithm
created, free to cite with attribution.

Venue market data inside `decisionContext` remains the venue's; see
`API_TERMS.md`. Citing a receipt to prove a decision was not altered is always
fine. Bulk-extracting the venue prices inside receipts is not.
