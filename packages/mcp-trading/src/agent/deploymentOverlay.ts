// The deployment overlay — CoinRithm's server-side AUTHORITY over an agent's
// runtime capacity. The OKF declares INTENT (its TriggerPolicy + cadence); the
// platform caps it to the agent's effective TIER here. It only ever TIGHTENS,
// never widens — so a forked OKF that sets `tier: pro` or `maxLlmCallsPerHour: 999`
// can't self-grant capacity. This is where "the OKF asks, CoinRithm decides" lives,
// and it's the prerequisite the monetization rule names: no paid tier without the
// overlay. (Billing/Stripe wires a real tier onto the agent later; until then every
// agent runs on a default tier and this still enforces it.)

import { TriggerPolicy } from "./types.js";

export type Tier = "free_demo" | "builder" | "pro" | "byok" | "house";

export interface TierLimits {
  maxLlmCallsPerHour: number; // 0 = unlimited
  minCadenceSeconds: number; // floor on how fast the agent may run
  maxConcurrentAgents: number; // per user; recorded here, enforced at deploy time
}

// Effective caps per tier. Tightenable later from config; these are the defaults.
export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free_demo: {
    maxLlmCallsPerHour: 4,
    minCadenceSeconds: 3600,
    maxConcurrentAgents: 1,
  },
  builder: {
    maxLlmCallsPerHour: 20,
    minCadenceSeconds: 900,
    maxConcurrentAgents: 3,
  },
  pro: {
    maxLlmCallsPerHour: 120,
    minCadenceSeconds: 60,
    maxConcurrentAgents: 10,
  },
  // BYO key = the user's own model quota, so we don't cap their calls; we still
  // host + meter + verify (that's what they pay the infra fee for).
  byok: {
    maxLlmCallsPerHour: 0,
    minCadenceSeconds: 60,
    maxConcurrentAgents: 5,
  },
  // The house showcase fleet — uncapped, runs on our pooled keys.
  house: {
    maxLlmCallsPerHour: 0,
    minCadenceSeconds: 60,
    maxConcurrentAgents: 0,
  },
};

// Tighten one numeric cap: 0 means "unlimited" on either side. The tier always wins
// where it imposes a finite cap; it can never raise a request.
function tighten(requested: number, tierCap: number): number {
  if (tierCap === 0) return requested; // tier unlimited -> honor the request
  if (requested === 0) return tierCap; // request unlimited -> tier caps it
  return Math.min(requested, tierCap); // both finite -> the tighter wins
}

// Cap the OKF's requested TriggerPolicy by the tier. NEVER widens.
export function applyDeploymentOverlay(
  requested: TriggerPolicy,
  tier: Tier,
): TriggerPolicy {
  const lim = TIER_LIMITS[tier];
  return {
    ...requested,
    maxLlmCallsPerHour: tighten(
      requested.maxLlmCallsPerHour,
      lim.maxLlmCallsPerHour,
    ),
  };
}

// Effective cadence (seconds): the agent's requested cadence floored by the tier
// (a free agent can't run every minute even if its OKF asks to).
export function effectiveCadenceSeconds(
  requestedSeconds: number,
  tier: Tier,
): number {
  return Math.max(requestedSeconds, TIER_LIMITS[tier].minCadenceSeconds);
}

// What to SHOW the user (the transparency the design calls for): OKF-requested vs
// platform-enforced, so it's clear the agent asks and CoinRithm decides.
export interface EffectivePolicyView {
  tier: Tier;
  requested: { maxLlmCallsPerHour: number; cadenceSeconds: number };
  effective: { maxLlmCallsPerHour: number; cadenceSeconds: number };
}
export function effectivePolicyView(
  requested: TriggerPolicy,
  requestedCadenceSeconds: number,
  tier: Tier,
): EffectivePolicyView {
  const eff = applyDeploymentOverlay(requested, tier);
  return {
    tier,
    requested: {
      maxLlmCallsPerHour: requested.maxLlmCallsPerHour,
      cadenceSeconds: requestedCadenceSeconds,
    },
    effective: {
      maxLlmCallsPerHour: eff.maxLlmCallsPerHour,
      cadenceSeconds: effectiveCadenceSeconds(requestedCadenceSeconds, tier),
    },
  };
}
