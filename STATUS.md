# CoinRithm API status — what we publish, and why there is no SLA yet

**Status: v1, 2026-08-12.** Written against measured infrastructure, not
aspiration.

---

## What you can poll today

| Endpoint | Answers | Auth |
|---|---|---|
| `GET /healthz` | Is the API process serving? Returns `200 ok`. | none |
| `GET /api/prediction-markets/sources/health` | Per-venue ingest lag, freshness tier against a published SLO, `degraded` flags, and a summary. | none |

The second is the one that matters for data consumers. Process liveness tells
you almost nothing about whether the numbers are current; venue freshness does.
It reports `lastIngestAt`, `lagSeconds`, a `freshness` tier, the governing
`policy` (cadence + freshness SLO, versioned), and any `staleReason`.

Deep checks (`/healthz/deep`, database and cache reachability) are **localhost
only by design**. Publishing dependency topology is a gift to an attacker, and a
consumer cannot act on it anyway.

## Why there is no uptime SLA

**Because we could not honour one today, and publishing a number we cannot
underwrite would be worse than publishing none.**

The honest position, stated plainly:

- CoinRithm runs on a **single host**. There is no second region, no failover,
  and no load-balanced replica. A host failure is a full outage.
- Database backups run daily and succeed, but **there is currently no off-host
  copy**. That is a known gap with an owner action attached; until it closes,
  the recovery story for a lost host is not one we would put a number against.
- **The backup is now verified restorable — but RTO is still not measured.**
  A restore drill on 2026-08-12 read the archive (1,122 entries), rebuilt the
  full schema (104 tables), and restored table data with row counts matching
  production. So the artifact is no longer an untested assumption. What has NOT
  been measured is how long a COMPLETE restore takes, because running one needs
  more free space than the host safely has — and doing it there would put the
  live database and its only backup at risk together. An SLA needs the number,
  not just the proof that recovery is possible.
- **RPO is up to 24 hours.** Backups are daily; anything written after the last
  dump is lost. That is a real bound, stated rather than smoothed.

An SLA is a contractual commitment about availability, backed by credits or
refunds. Offering one before the above is fixed would be selling a guarantee we
know we cannot keep. The infrastructure comes first; the promise follows.

## What we do commit to, informally

- The keyless endpoints stay keyless and free. Nothing free today becomes paid.
- Breaking contract changes are versioned, not silently switched.
- Data-quality facts are published rather than smoothed: per-venue coverage,
  completeness classification, known gaps, resolution provenance and the
  consensus methodology version all ship as part of the API surface, including
  when they are unflattering.

Those are things we can actually keep. When single-host, off-host backup and a
drilled RTO are all resolved, an SLA becomes an honest thing to offer, and this
document is where it will appear.

## Reporting a problem

Open an issue on this repository with the endpoint, the timestamp, and the
response you saw. If the numbers look wrong rather than the service being down,
include the relevant `methodologyVersion` or `contentHash` — both are served
precisely so a disagreement can be traced to a specific computation.
