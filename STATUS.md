# CoinRithm API status — what we publish, and why there is no SLA yet

**Status: v2, 2026-09-23.** Backup coverage rechecked on this date; the last
documented restore drill remains 2026-08-12.

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
- Database backups run daily at 03:00 UTC and are copied to **Cloudflare R2**.
  On 2026-09-23, an authenticated object listing confirmed all 14 daily archives
  from September 10–23, with sizes matching the backup records. Independent
  metadata requests for the latest two archives also succeeded. The latest
  upload completed at 03:24 UTC. Configured retention limits are 2 local copies
  and 14 remote copies; an older failed execution also left an archive outside
  normal retention. These checks establish off-host database coverage, not
  coverage of every service configuration or backup immutability.
- **A historical restore drill passed; complete recovery time (RTO) remains
  unmeasured.**
  A restore drill on 2026-08-12 read the archive (1,122 entries), rebuilt the
  full schema (104 tables), and restored table data with row counts matching
  production. On September 23, the latest local archive's table of contents was
  readable: 1,241 entries, including 118 public tables and 9 agent-runtime
  tables with corresponding data entries. That metadata check was not a full
  restore, and remote object sizes do not prove recovery. A timed restore from
  R2 into an isolated environment is still needed to measure complete recovery.
- **The daily backup schedule targets a 24-hour recovery point (RPO).** Actual
  recoverable data depends on the last successfully completed, usable backup;
  delays or failed jobs can widen the gap. Writes after that backup's snapshot
  require another recovery source or would be lost in a host failure.

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

Those are things we can actually keep. Off-host database copies are now verified.
Availability beyond a single host and a measured complete recovery time remain
open requirements before offering an SLA; this document will track that work.

## Reporting a problem

Open an issue on this repository with the endpoint, the timestamp, and the
response you saw. If the numbers look wrong rather than the service being down,
include the relevant `methodologyVersion` or `contentHash` — both are served
precisely so a disagreement can be traced to a specific computation.
