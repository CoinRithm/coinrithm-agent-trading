// Thesis exits (slice 2 of "house agents are not fun", 2026-09-02).
//
// A position is opened ON a thesis and leaves when that thesis is INVALIDATED,
// not only when a stop-loss / take-profit fires or a small adverse tick spooks
// the model. The model states the thesis inside its open action; the runner
// sanitizes it side-aware, persists it with the position (RunState.theses,
// keyed "<venue>:<positionId>") and re-evaluates the machine-checkable parts
// every cycle: price levels against the live mark, probability levels against
// the outcome's current market probability, time in trade against the time
// stop. A futures position whose thesis broke is closed by the runner; PM has
// no close endpoint, so an invalidated PM thesis is surfaced to the model (do
// not add; let it settle). The free-text catalyst is never machine-evaluated:
// the model re-judges it while it manages the position.
//
// Pure functions over plain objects; nowMs is injected so every rule is
// testable without timers. Nothing here widens a cap or touches the kill
// switch: a thesis exit is a risk-REDUCING close, and the runner executes it
// only after the kill-switch and drawdown checks have passed.

import {
  Observation,
  OpenPosition,
  PmPosition,
  PositionThesis,
  RunState,
  Thesis,
  ThesisInvalidation,
  ThesisView,
  Venue,
} from "./types.js";

// A time stop shorter than an hour on a 3-minute cadence is the churn this
// slice exists to end; longer than 30 days is not a time stop.
export const THESIS_MIN_HOLD_MINUTES = 60;
export const THESIS_MAX_HOLD_MINUTES = 60 * 24 * 30;
export const THESIS_SUMMARY_MAX_CHARS = 200;
export const THESIS_CATALYST_MAX_CHARS = 160;
// Bound the persisted map so a runaway fleet member cannot grow the state JSON.
export const MAX_PERSISTED_THESES = 60;

const LEVEL_KEYS = [
  "priceBelow",
  "priceAbove",
  "probabilityBelow",
  "probabilityAbove",
  "maxHoldMinutes",
] as const;
type LevelKey = (typeof LEVEL_KEYS)[number];

export function thesisKey(venue: Venue, positionId: number): string {
  return `${venue}:${positionId}`;
}

// A finite positive number, tolerating the stringified numbers small models
// emit ("64000"). Anything else is absent.
function finitePositive(v: unknown): number | undefined {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined;
}

function cleanText(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : undefined;
}

function readInvalidation(raw: Record<string, unknown>): ThesisInvalidation {
  const out: ThesisInvalidation = {};
  for (const k of LEVEL_KEYS) {
    const n = finitePositive(raw[k]);
    if (n != null) out[k] = n;
  }
  const catalyst = cleanText(raw.catalyst, THESIS_CATALYST_MAX_CHARS);
  if (catalyst) out.catalyst = catalyst;
  return out;
}

export function hasInvalidationCondition(inv: ThesisInvalidation): boolean {
  return LEVEL_KEYS.some((k) => inv[k] != null) || !!inv.catalyst;
}

// Parse a model-emitted thesis. TOLERANT by design (like forecastProbability):
// a missing / malformed thesis becomes undefined and never fails the action.
// Accepts the nested contract {summary, invalidation:{...}} and, for weak
// models, a flattened {summary, priceBelow, ...}. Numbers may be strings.
export function coerceThesis(raw: unknown): Thesis | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const nested =
    o.invalidation &&
    typeof o.invalidation === "object" &&
    !Array.isArray(o.invalidation)
      ? (o.invalidation as Record<string, unknown>)
      : undefined;
  const invalidation = readInvalidation(nested ?? o);
  const summary = cleanText(o.summary, THESIS_SUMMARY_MAX_CHARS);
  if (!summary && !hasInvalidationCondition(invalidation)) return undefined;
  return { summary: summary ?? "(no summary stated)", invalidation };
}

export interface BindThesisInput {
  thesis: Thesis;
  venue: "futures" | "pm";
  positionId: number;
  openedAt: string; // ISO
  side?: string; // long | short | yes | no
  symbol?: string; // futures
  entryPrice?: number; // futures fill
  source?: string; // pm
  slug?: string; // pm
  outcomeExternalMarketId?: string; // pm
  entryProbability?: number; // pm, 0..100 points of the outcome's probability
}

export interface BoundThesis {
  thesis: PositionThesis;
  // Human-readable notes on what was dropped or clamped (for the cycle log).
  notes: string[];
}

// Bind a thesis to a freshly opened position, sanitizing it SIDE-AWARE so a
// wrong-side level can never fire on the next tick: a rising price is never
// what invalidates a long, a falling one never invalidates a short; for a YES
// bet the odds must FALL to break it, for a NO bet they must RISE. Levels on the
// wrong side of entry, levels for the other venue, and out-of-range values are
// dropped (never silently re-signed); the time stop is clamped to the floor /
// ceiling. Every drop or clamp is reported in `notes`.
export function bindThesis(input: BindThesisInput): BoundThesis {
  const notes: string[] = [];
  const inv: ThesisInvalidation = { ...input.thesis.invalidation };
  const side = (input.side ?? "").toLowerCase();
  const drop = (k: LevelKey, why: string) => {
    if (inv[k] == null) return;
    delete inv[k];
    notes.push(`dropped ${k}: ${why}`);
  };
  if (input.venue === "futures") {
    drop("probabilityBelow", "not a coin condition");
    drop("probabilityAbove", "not a coin condition");
    if (side === "short") {
      drop("priceBelow", "a falling price never invalidates a short");
      if (
        inv.priceAbove != null &&
        input.entryPrice != null &&
        inv.priceAbove <= input.entryPrice
      ) {
        drop("priceAbove", `must be above entry ${input.entryPrice}`);
      }
    } else {
      drop("priceAbove", "a rising price never invalidates a long");
      if (
        inv.priceBelow != null &&
        input.entryPrice != null &&
        inv.priceBelow >= input.entryPrice
      ) {
        drop("priceBelow", `must be below entry ${input.entryPrice}`);
      }
    }
  } else {
    drop("priceBelow", "not a prediction-market condition");
    drop("priceAbove", "not a prediction-market condition");
    for (const k of ["probabilityBelow", "probabilityAbove"] as const) {
      if (inv[k] != null && inv[k]! > 100) drop(k, "0..100 points");
    }
    if (side === "no") {
      drop("probabilityBelow", "falling odds never invalidate a NO");
      if (
        inv.probabilityAbove != null &&
        input.entryProbability != null &&
        inv.probabilityAbove <= input.entryProbability
      ) {
        drop(
          "probabilityAbove",
          `must be above entry ${input.entryProbability}`,
        );
      }
    } else {
      drop("probabilityAbove", "rising odds never invalidate a YES");
      if (
        inv.probabilityBelow != null &&
        input.entryProbability != null &&
        inv.probabilityBelow >= input.entryProbability
      ) {
        drop(
          "probabilityBelow",
          `must be below entry ${input.entryProbability}`,
        );
      }
    }
  }
  if (inv.maxHoldMinutes != null) {
    const raw = inv.maxHoldMinutes;
    const clamped = Math.min(
      THESIS_MAX_HOLD_MINUTES,
      Math.max(THESIS_MIN_HOLD_MINUTES, Math.round(raw)),
    );
    if (clamped !== raw) {
      notes.push(`maxHoldMinutes ${raw} clamped to ${clamped}`);
      inv.maxHoldMinutes = clamped;
    }
  }
  const thesis: PositionThesis = {
    summary: input.thesis.summary,
    invalidation: inv,
    venue: input.venue,
    positionId: input.positionId,
    openedAt: input.openedAt,
  };
  if (input.symbol) thesis.symbol = input.symbol;
  if (side) thesis.side = side;
  if (input.source) thesis.source = input.source;
  if (input.slug) thesis.slug = input.slug;
  if (input.outcomeExternalMarketId)
    thesis.outcomeExternalMarketId = input.outcomeExternalMarketId;
  if (input.entryPrice != null) thesis.entryPrice = input.entryPrice;
  if (input.entryProbability != null)
    thesis.entryProbability = input.entryProbability;
  return { thesis, notes };
}

// Whole minutes in the trade, from the position's own openedAt (the server's
// clock) when present, else the openedAt recorded at bind time.
export function holdMinutesOf(
  openedAt: string | undefined,
  fallback: string,
  nowMs: number,
): number {
  const t = Date.parse(openedAt ?? fallback);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.round((nowMs - t) / 60_000));
}

function view(
  t: PositionThesis,
  holdMinutes: number,
  invalidatedBy: string | undefined,
): ThesisView {
  return {
    summary: t.summary,
    invalidation: t.invalidation,
    holdMinutes,
    status: invalidatedBy ? "invalidated" : "intact",
    ...(invalidatedBy ? { invalidatedBy } : {}),
  };
}

// Evaluate a futures thesis against the live position for THIS cycle. Price
// levels are checked against the mark (at-or-beyond), then the time stop. A
// position with no mark this cycle is judged on the time stop only.
export function evaluateFuturesThesis(
  t: PositionThesis,
  pos: OpenPosition,
  nowMs: number,
): ThesisView {
  const holdMinutes = holdMinutesOf(pos.openedAt, t.openedAt, nowMs);
  const inv = t.invalidation;
  const mark = pos.markPrice;
  let invalidatedBy: string | undefined;
  if (typeof mark === "number" && Number.isFinite(mark)) {
    if (inv.priceBelow != null && mark <= inv.priceBelow) {
      invalidatedBy = `mark ${mark} at or below priceBelow ${inv.priceBelow}`;
    } else if (inv.priceAbove != null && mark >= inv.priceAbove) {
      invalidatedBy = `mark ${mark} at or above priceAbove ${inv.priceAbove}`;
    }
  }
  if (
    !invalidatedBy &&
    inv.maxHoldMinutes != null &&
    holdMinutes >= inv.maxHoldMinutes
  ) {
    invalidatedBy = `held ${holdMinutes}m, time stop ${inv.maxHoldMinutes}m`;
  }
  return view(t, holdMinutes, invalidatedBy);
}

// Evaluate a prediction-market thesis against the outcome's CURRENT market
// probability (0..100 points, present only while the position is open).
export function evaluatePmThesis(
  t: PositionThesis,
  pos: PmPosition,
  nowMs: number,
): ThesisView {
  const holdMinutes = holdMinutesOf(pos.openedAt, t.openedAt, nowMs);
  const inv = t.invalidation;
  const cur = pos.currentProbability;
  let invalidatedBy: string | undefined;
  if (typeof cur === "number" && Number.isFinite(cur)) {
    if (inv.probabilityBelow != null && cur <= inv.probabilityBelow) {
      invalidatedBy = `probability ${cur} at or below probabilityBelow ${inv.probabilityBelow}`;
    } else if (inv.probabilityAbove != null && cur >= inv.probabilityAbove) {
      invalidatedBy = `probability ${cur} at or above probabilityAbove ${inv.probabilityAbove}`;
    }
  }
  if (
    !invalidatedBy &&
    inv.maxHoldMinutes != null &&
    holdMinutes >= inv.maxHoldMinutes
  ) {
    invalidatedBy = `held ${holdMinutes}m, time stop ${inv.maxHoldMinutes}m`;
  }
  return view(t, holdMinutes, invalidatedBy);
}

// Attach the evaluated thesis to every open position that has one and prune
// theses whose position is gone (closed, stopped, liquidated, settled). Futures
// positions are a required read, so a missing futures position is truly gone;
// PM theses are pruned only when the caller actually read the pm book.
export function attachTheses(
  observation: Observation,
  state: RunState,
  nowMs: number,
  opts: { prunePm: boolean },
): { attached: number; pruned: string[] } {
  const theses = state.theses;
  if (!theses) return { attached: 0, pruned: [] };
  const live = new Set<string>();
  let attached = 0;
  for (const pos of observation.openPositions) {
    if (pos.venue !== "futures") continue;
    const key = thesisKey("futures", pos.id);
    live.add(key);
    const t = theses[key];
    if (!t) continue;
    pos.thesis = evaluateFuturesThesis(t, pos, nowMs);
    attached += 1;
  }
  for (const pos of observation.pmPositions ?? []) {
    const key = thesisKey("pm", pos.id);
    live.add(key);
    const t = theses[key];
    if (!t) continue;
    pos.thesis = evaluatePmThesis(t, pos, nowMs);
    attached += 1;
  }
  const pruned: string[] = [];
  for (const key of Object.keys(theses)) {
    if (live.has(key)) continue;
    const t = theses[key]!;
    if (t.venue === "pm" && !opts.prunePm) continue;
    if (t.venue === "spot") continue; // never bound today; defensive
    delete theses[key];
    pruned.push(key);
  }
  return { attached, pruned };
}

// The futures positions the runner must close this cycle: thesis invalidated.
export function thesisExits(observation: Observation): OpenPosition[] {
  return observation.openPositions.filter(
    (p) => p.venue === "futures" && p.thesis?.status === "invalidated",
  );
}

export function rememberThesis(state: RunState, thesis: PositionThesis): void {
  const theses: Record<string, PositionThesis> = { ...(state.theses ?? {}) };
  theses[thesisKey(thesis.venue, thesis.positionId)] = thesis;
  const keys = Object.keys(theses);
  if (keys.length > MAX_PERSISTED_THESES) {
    keys.sort(
      (a, b) =>
        Date.parse(theses[a]!.openedAt) - Date.parse(theses[b]!.openedAt),
    );
    for (const k of keys.slice(0, keys.length - MAX_PERSISTED_THESES))
      delete theses[k];
  }
  state.theses = theses;
}

export function forgetThesis(state: RunState, key: string): void {
  if (!state.theses || !(key in state.theses)) return;
  const theses = { ...state.theses };
  delete theses[key];
  state.theses = theses;
}

// One-line rendering for logs and the journal.
export function describeInvalidation(inv: ThesisInvalidation): string {
  const parts: string[] = [];
  if (inv.priceBelow != null) parts.push(`priceBelow ${inv.priceBelow}`);
  if (inv.priceAbove != null) parts.push(`priceAbove ${inv.priceAbove}`);
  if (inv.probabilityBelow != null)
    parts.push(`probabilityBelow ${inv.probabilityBelow}`);
  if (inv.probabilityAbove != null)
    parts.push(`probabilityAbove ${inv.probabilityAbove}`);
  if (inv.maxHoldMinutes != null)
    parts.push(`time stop ${inv.maxHoldMinutes}m`);
  if (inv.catalyst) parts.push(`catalyst: ${inv.catalyst}`);
  return parts.length > 0 ? parts.join(", ") : "no condition";
}
