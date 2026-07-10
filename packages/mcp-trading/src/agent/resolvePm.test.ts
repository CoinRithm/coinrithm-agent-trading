import { describe, expect, it } from "vitest";
import { resolvePmRef } from "./resolvePm.js";
import { PmMarket, ProposedAction } from "./types.js";

type PmOpen = Extract<ProposedAction, { type: "pm_open" }>;

const markets: PmMarket[] = [
  {
    ref: "pm1",
    source: "kalshi",
    slug: "btc-up",
    outcomeExternalMarketId: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA-yes",
    outcomeName: "Yes",
    probability: 0.35,
  },
  {
    ref: "pm2",
    source: "polymarket",
    slug: "eth-3k",
    outcomeExternalMarketId: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB-no",
    outcomeName: "No",
    probability: 0.62,
  },
];

const base: Omit<PmOpen, "ref" | "source" | "slug" | "outcomeExternalMarketId"> = {
  type: "pm_open",
  stakeMusd: 25,
  confidence: 0.7,
};

describe("resolvePmRef", () => {
  it("resolves a short ref to the canonical triple and drops the ref", () => {
    const r = resolvePmRef({ ...base, ref: "pm2" } as PmOpen, markets);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.action.ref).toBeUndefined();
    expect(r.action.source).toBe("polymarket");
    expect(r.action.slug).toBe("eth-3k");
    expect(r.action.outcomeExternalMarketId).toBe(markets[1].outcomeExternalMarketId);
    expect(r.action.stakeMusd).toBe(25); // other fields preserved
  });

  it("is case-insensitive on the ref token", () => {
    const r = resolvePmRef({ ...base, ref: "PM1" } as PmOpen, markets);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.action.source).toBe("kalshi");
  });

  it("rejects an unknown ref with pm_ref_unknown (and lists the valid range)", () => {
    const r = resolvePmRef({ ...base, ref: "pm9" } as PmOpen, markets);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("pm_ref_unknown");
    expect(r.reason).toContain("pm1..pm2");
  });

  it("labels an out-of-range ref as INVENTED (index past what was listed)", () => {
    // pm9 against a 2-market board -> the model made up a market never offered.
    const r = resolvePmRef({ ...base, ref: "pm9" } as PmOpen, markets);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toMatch(/invented/i);
    expect(r.reason).toContain("pm1..pm2");
  });

  it("labels a ref against an empty board as INVENTED (nothing was listed this cycle)", () => {
    const r = resolvePmRef({ ...base, ref: "pm1" } as PmOpen, []);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("pm_ref_unknown");
    expect(r.reason).toMatch(/invented/i);
    expect(r.reason).toContain("none discovered");
  });

  it("labels an in-range but unmatched ref as STALE (refs shifted vs a prior cycle)", () => {
    // Synthetic non-contiguous board: pm1 and pm3 exist but pm2 does not. A pm2 ref
    // is IN range (<= listed count) yet matches nothing -> stale, not invented.
    const gapped: PmMarket[] = [
      { ...markets[0], ref: "pm1" },
      { ...markets[1], ref: "pm3" },
    ];
    const r = resolvePmRef({ ...base, ref: "pm2" } as PmOpen, gapped);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("pm_ref_unknown");
    expect(r.reason).toMatch(/stale/i);
  });

  it("passes a correct full triple through unchanged (back-compat, no ref)", () => {
    const action = {
      ...base,
      source: "kalshi",
      slug: "btc-up",
      outcomeExternalMarketId: markets[0].outcomeExternalMarketId,
    } as PmOpen;
    const r = resolvePmRef(action, markets);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.action.source).toBe("kalshi");
    expect(r.action.outcomeExternalMarketId).toBe(markets[0].outcomeExternalMarketId);
  });

  it("recovers a ref the model dropped into an id field (small-model slip)", () => {
    // 8B model put 'pm2' into outcomeExternalMarketId instead of ref.
    const action = {
      ...base,
      outcomeExternalMarketId: "pm2",
    } as PmOpen;
    const r = resolvePmRef(action, markets);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.action.source).toBe("polymarket");
    expect(r.action.outcomeExternalMarketId).toBe(markets[1].outcomeExternalMarketId);
  });

  it("rejects pm_open with neither a ref nor a full triple (pm_ref_missing)", () => {
    const r = resolvePmRef({ ...base } as PmOpen, markets);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("pm_ref_missing");
  });

  it("does not false-positive a genuine long id as a ref", () => {
    // A real id is never /^pm\\d+$/, so the full-triple path is taken and matched.
    const action = {
      ...base,
      source: "polymarket",
      slug: "eth-3k",
      outcomeExternalMarketId: markets[1].outcomeExternalMarketId,
    } as PmOpen;
    const r = resolvePmRef(action, markets);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.action.slug).toBe("eth-3k");
  });
});
