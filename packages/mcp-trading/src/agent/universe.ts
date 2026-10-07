// Agent market BOUNDARIES (owner 2026-10-07, Telegram 56641/56644). Instead of
// a fixed coin list, a bundle declares where its agent may look:
//
//   universe:
//     rank: { min: 1, max: 100 }      # market-cap rank band
//     minVolume24hUsd: 1000000        # liquidity floor
//     excludeStablecoins: true
//     includeSectors: [defi, ai]      # curated ids, GET /api/agent/universe/sectors
//     excludeSectors: [meme]
//     sort: abs_change_24h            # what "an opportunity" means first
//     resolveTop: 6                   # rows resolved into full watch entries
//
// Each cycle observe() asks GET /api/agent/universe for the rows inside those
// boundaries, resolves the top few into full watch entries (marked
// `discovered: true`) and passes the rest as compact context. The validator's
// tradable set is watch membership, so a discovered row is tradable for that
// cycle and every cap still applies; the blocklist still wins. The server
// filters, and filterUniverseRows re-checks what the row says about itself,
// so a wrong or older server can narrow the set but never widen it.

import type { UniverseConfig } from "./types.js";

export const UNIVERSE_SORTS = [
  "gainers_24h",
  "losers_24h",
  "abs_change_24h",
  "abs_change_1h",
  "volume_24h",
  "rank",
] as const;
export type UniverseSort = (typeof UNIVERSE_SORTS)[number];

export const UNIVERSE_DEFAULTS = {
  rankMin: 1,
  rankMax: 100,
  minVolume24hUsd: 0,
  sort: "abs_change_24h" as UniverseSort,
  resolveTop: 6,
  scanLimit: 15,
};
export const UNIVERSE_MAX_RESOLVE_TOP = 10;
export const UNIVERSE_MAX_SCAN_LIMIT = 50;
const SECTOR_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** True when the agent discovers candidates beyond its watchlist. */
export function scansUniverse(spec: {
  capabilities: readonly string[];
  universe?: UniverseConfig;
}): boolean {
  return (
    spec.universe !== undefined || spec.capabilities.includes("universe_scan")
  );
}

export interface UniverseQuery {
  rankMin: number;
  rankMax: number;
  minVolume24hUsd: number;
  excludeStablecoins: boolean;
  includeSectors: string[];
  excludeSectors: string[];
  sort: UniverseSort;
  limit: number;
}

/** The screener query a validated universe block asks for. */
export function universeQuery(u: UniverseConfig): UniverseQuery {
  return {
    rankMin: u.rank?.min ?? UNIVERSE_DEFAULTS.rankMin,
    rankMax: u.rank?.max ?? UNIVERSE_DEFAULTS.rankMax,
    minVolume24hUsd: u.minVolume24hUsd ?? UNIVERSE_DEFAULTS.minVolume24hUsd,
    excludeStablecoins: u.excludeStablecoins ?? false,
    includeSectors: [...(u.includeSectors ?? [])],
    excludeSectors: [...(u.excludeSectors ?? [])],
    sort: u.sort ?? UNIVERSE_DEFAULTS.sort,
    limit: u.scanLimit ?? UNIVERSE_DEFAULTS.scanLimit,
  };
}

/** How many screener rows become full watch entries this cycle. */
export function universeResolveTop(u: UniverseConfig): number {
  return Math.min(
    u.resolveTop ?? UNIVERSE_DEFAULTS.resolveTop,
    UNIVERSE_MAX_RESOLVE_TOP,
  );
}

/** Wire form: csv sectors, string numbers; empty filters are omitted. With
 * `ucids`, the same boundaries are applied to just those coins (membership). */
export function universeQueryParams(
  q: UniverseQuery,
  ucids?: readonly string[],
): Record<string, string | number> {
  return {
    ...(ucids && ucids.length > 0 ? { ucids: ucids.join(",") } : {}),
    rankMin: q.rankMin,
    rankMax: q.rankMax,
    minVolume24hUsd: q.minVolume24hUsd,
    excludeStablecoins: q.excludeStablecoins ? "true" : "false",
    ...(q.includeSectors.length
      ? { includeSectors: q.includeSectors.join(",") }
      : {}),
    ...(q.excludeSectors.length
      ? { excludeSectors: q.excludeSectors.join(",") }
      : {}),
    sort: q.sort,
    limit: q.limit,
  };
}

export interface UniverseRow {
  symbol: string;
  coinId?: string;
  name?: string;
  slug?: string;
  marketCapRank?: number;
  priceUsd?: number;
  change1h?: number;
  change24h?: number;
  change7d?: number;
  volume24hUsd?: number;
  sectors?: string[];
}

/** Keep malformed evidence unknown; dropping bad elements can widen a screen. */
export function universeSectorsOf(raw: unknown): string[] | undefined {
  return Array.isArray(raw) &&
    raw.every((s) => typeof s === "string" && SECTOR_ID_RE.test(s))
    ? raw
    : undefined;
}

/**
 * Defence in depth on server rows (never widen): a row is kept only when its
 * own fields PROVE it is inside every enabled boundary. The rank band is
 * always enabled, so a row without a rank is dropped; a volume floor needs a
 * volume; any sector rule (stablecoins out, sectors out, sectors in) needs the
 * row's sector list. Missing or malformed evidence drops the row (root review
 * 2026-10-07: unverifiable is not inside).
 */
export function filterUniverseRows(
  rows: UniverseRow[],
  q: UniverseQuery,
): UniverseRow[] {
  const excluded = new Set([
    ...q.excludeSectors,
    ...(q.excludeStablecoins ? ["stablecoins"] : []),
  ]);
  const included = q.includeSectors.filter((s) => !excluded.has(s));
  const sectorRules = excluded.size > 0 || q.includeSectors.length > 0;
  return rows.filter((r) => {
    const rank = r.marketCapRank;
    if (typeof rank !== "number" || !Number.isFinite(rank)) return false;
    if (rank < q.rankMin || rank > q.rankMax) return false;
    if (q.minVolume24hUsd > 0) {
      const vol = r.volume24hUsd;
      if (typeof vol !== "number" || !Number.isFinite(vol)) return false;
      if (vol < q.minVolume24hUsd) return false;
    }
    if (sectorRules) {
      const sectors = universeSectorsOf(r.sectors);
      if (sectors === undefined) return false;
      if (sectors.some((s) => excluded.has(s))) return false;
      if (
        q.includeSectors.length > 0 &&
        !sectors.some((s) => included.includes(s))
      )
        return false;
    }
    return true;
  });
}

/**
 * Entry eligibility under declared boundaries (root review 2026-10-07): with a
 * `universe` block, a NEW position may only be opened on a coin proven inside
 * the boundaries this cycle: a discovered row, or a watchlist coin the
 * screener confirmed (`withinBoundaries: true`). Anything else (outside, or
 * unverifiable because the check failed) stays visible as context and can
 * still be closed or sold, but not entered. Returns the rejection reason, or
 * null when the entry is allowed. No universe block = no extra rule.
 */
export function universeEntryBlock(
  spec: { universe?: UniverseConfig },
  entry: { discovered?: boolean; withinBoundaries?: boolean },
): string | null {
  if (!spec.universe) return null;
  if (entry.discovered === true || entry.withinBoundaries === true) return null;
  return entry.withinBoundaries === false
    ? "outside the declared market boundaries"
    : "not verified inside the declared market boundaries this cycle";
}

/** Validation issues for a raw `universe` block ([] when valid or absent). */
export function universeIssues(raw: unknown): Array<[string, string]> {
  if (raw === undefined) return [];
  const issues: Array<[string, string]> = [];
  const add = (code: string, reason: string) => issues.push([code, reason]);
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    add("skill_universe", "universe must be a mapping");
    return issues;
  }
  const u = raw as Record<string, unknown>;
  const int = (v: unknown, lo: number, hi: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;

  if (u.rank !== undefined) {
    const rank = u.rank as Record<string, unknown> | null;
    if (rank === null || typeof rank !== "object" || Array.isArray(rank)) {
      add("skill_universe_rank", "universe.rank must be { min, max }");
    } else {
      if (rank.min !== undefined && !int(rank.min, 1, 10_000))
        add(
          "skill_universe_rank",
          "universe.rank.min must be a whole number between 1 and 10000",
        );
      if (rank.max !== undefined && !int(rank.max, 1, 10_000))
        add(
          "skill_universe_rank",
          "universe.rank.max must be a whole number between 1 and 10000",
        );
      const min = (rank.min as number | undefined) ?? UNIVERSE_DEFAULTS.rankMin;
      const max = (rank.max as number | undefined) ?? UNIVERSE_DEFAULTS.rankMax;
      if (int(min, 1, 10_000) && int(max, 1, 10_000) && min > max)
        add("skill_universe_rank", "universe.rank.min must be <= rank.max");
    }
  }
  if (
    u.minVolume24hUsd !== undefined &&
    !(
      typeof u.minVolume24hUsd === "number" &&
      Number.isFinite(u.minVolume24hUsd) &&
      u.minVolume24hUsd >= 0
    )
  )
    add(
      "skill_universe_volume",
      "universe.minVolume24hUsd must be a number >= 0",
    );
  if (
    u.excludeStablecoins !== undefined &&
    typeof u.excludeStablecoins !== "boolean"
  )
    add(
      "skill_universe_stablecoins",
      "universe.excludeStablecoins must be true or false",
    );
  for (const key of ["includeSectors", "excludeSectors"] as const) {
    const v = u[key];
    if (v === undefined) continue;
    if (
      !Array.isArray(v) ||
      v.length > 50 ||
      !v.every((s) => typeof s === "string" && SECTOR_ID_RE.test(s))
    )
      add(
        "skill_universe_sectors",
        `universe.${key} must be a list of sector ids like "defi" or "eco-solana" (GET /api/agent/universe/sectors)`,
      );
  }
  if (
    u.sort !== undefined &&
    !(UNIVERSE_SORTS as readonly unknown[]).includes(u.sort)
  )
    add(
      "skill_universe_sort",
      `universe.sort must be one of ${UNIVERSE_SORTS.join(", ")}`,
    );
  if (
    u.resolveTop !== undefined &&
    !int(u.resolveTop, 1, UNIVERSE_MAX_RESOLVE_TOP)
  )
    add(
      "skill_universe_resolve_top",
      `universe.resolveTop must be a whole number between 1 and ${UNIVERSE_MAX_RESOLVE_TOP}`,
    );
  if (
    u.scanLimit !== undefined &&
    !int(u.scanLimit, 1, UNIVERSE_MAX_SCAN_LIMIT)
  )
    add(
      "skill_universe_scan_limit",
      `universe.scanLimit must be a whole number between 1 and ${UNIVERSE_MAX_SCAN_LIMIT}`,
    );
  return issues;
}

/** One line for the prompt: the boundaries in plain words. */
export function describeUniverse(u: UniverseConfig): string {
  const q = universeQuery(u);
  const parts = [`market-cap rank ${q.rankMin}-${q.rankMax}`];
  if (q.minVolume24hUsd > 0)
    parts.push(
      `24h volume >= $${Math.round(q.minVolume24hUsd).toLocaleString("en-US")}`,
    );
  if (q.excludeStablecoins) parts.push("no stablecoins");
  if (q.includeSectors.length)
    parts.push(`only sectors: ${q.includeSectors.join(", ")}`);
  if (q.excludeSectors.length)
    parts.push(`excluding sectors: ${q.excludeSectors.join(", ")}`);
  parts.push(`ranked by ${q.sort.replace(/_/g, " ")}`);
  return parts.join("; ");
}
