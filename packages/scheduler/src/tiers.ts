// Agent-runtime TIERS — the thin paid-tier scaffolding.
//
// Defines the limits each plan runs under and a PURE gate over (plan, current
// usage). There is NO billing or payment here on purpose: this is the structure
// + enforcement logic that the deploy route, the scheduler, and a future
// billing/UI layer read. The metering it consumes ALREADY exists
// (agent_runtime.agent_cycles.estimated_cost_usd — see sql/001, "the data the
// future credit system + tier pricing read").
//
// Non-blocking by construction: 'free' is the default and 'house' is exempt, so
// adding this changes NO live behavior until a caller chooses to enforce a gate
// result. The product wedge it encodes (owner's call on pricing): free = BYO-key
// or shared-free brain, 1 slow agent; pro = CoinRithm-hosted, more agents, faster
// cadence, capable models, a higher metered compute budget.

export type AgentPlan = "free" | "pro" | "house";

export interface TierLimits {
  plan: AgentPlan;
  label: string;
  /** Hosted agents one owner may run concurrently. */
  maxAgentsPerOwner: number;
  /** Fastest run cadence allowed (a faster request is clamped UP to this). */
  minCadenceSeconds: number;
  /** Which brain a deploy may select. */
  allowedModelTier: "shared-free" | "capable" | "any";
  /** Soft cap on metered estimated_cost_usd over a rolling 30-day window. */
  monthlyComputeBudgetUsd: number;
}

// Defaults are deliberately conservative placeholders — the owner sets real
// numbers when pricing goes live. They exist so the model is REAL and testable,
// not so they are final.
export const TIER_LIMITS: Record<AgentPlan, TierLimits> = {
  free: {
    plan: "free",
    label: "Free",
    maxAgentsPerOwner: 1,
    minCadenceSeconds: 1800, // 30 min — slow, runs on the shared free brain pool
    allowedModelTier: "shared-free",
    monthlyComputeBudgetUsd: 2, // generous for a paper proving ground; metering-bounded
  },
  pro: {
    plan: "pro",
    label: "Pro",
    maxAgentsPerOwner: 5,
    minCadenceSeconds: 300, // 5 min — faster cadence
    allowedModelTier: "capable", // Nemotron-49B / Llama-70B / BYO premium
    monthlyComputeBudgetUsd: 50,
  },
  house: {
    plan: "house",
    label: "House",
    maxAgentsPerOwner: Number.POSITIVE_INFINITY,
    minCadenceSeconds: 60,
    allowedModelTier: "any",
    monthlyComputeBudgetUsd: Number.POSITIVE_INFINITY,
  },
};

/** Unknown/empty plan strings fall back to the safe default (free). */
export function limitsForPlan(plan: string | null | undefined): TierLimits {
  if (plan === "pro") return TIER_LIMITS.pro;
  if (plan === "house") return TIER_LIMITS.house;
  return TIER_LIMITS.free;
}

function limitsFor(plan: string | null | undefined, isHouse?: boolean): TierLimits {
  return isHouse ? TIER_LIMITS.house : limitsForPlan(plan);
}

export interface DeployRequest {
  plan: string | null | undefined;
  /** How many non-disabled agents the owner already runs. */
  currentAgentCount: number;
  /** Requested cadence; clamped up to the tier floor. */
  cadenceSeconds: number;
  isHouse?: boolean;
}

export interface GateResult {
  allowed: boolean;
  reasons: string[];
  /** Cadence the deploy should actually use (>= the tier floor). */
  effectiveCadenceSeconds: number;
  limits: TierLimits;
}

/**
 * Deploy gate: may this owner stand up another agent, and at what cadence?
 * Hard-rejects on the agent cap; SOFT-clamps cadence up to the tier floor rather
 * than rejecting (a request for a faster-than-allowed cadence still deploys, just
 * throttled). Pure — the caller decides whether to honor `allowed`.
 */
export function evaluateDeploy(req: DeployRequest): GateResult {
  const limits = limitsFor(req.plan, req.isHouse);
  const reasons: string[] = [];
  if (req.currentAgentCount >= limits.maxAgentsPerOwner) {
    reasons.push(`agent_cap_reached:${limits.maxAgentsPerOwner}`);
  }
  const requested = Number.isFinite(req.cadenceSeconds) ? req.cadenceSeconds : limits.minCadenceSeconds;
  const effectiveCadenceSeconds = Math.max(requested, limits.minCadenceSeconds);
  return { allowed: reasons.length === 0, reasons, effectiveCadenceSeconds, limits };
}

export interface BudgetState {
  plan: string | null | undefined;
  /** Metered estimated_cost_usd for this owner over the rolling window. */
  costThisPeriodUsd: number;
  isHouse?: boolean;
}

/** True once an owner's metered compute crosses their tier's monthly budget. */
export function isOverBudget(s: BudgetState): boolean {
  return s.costThisPeriodUsd >= limitsFor(s.plan, s.isHouse).monthlyComputeBudgetUsd;
}

export interface TierStatus {
  plan: AgentPlan;
  limits: TierLimits;
  agentCount: number;
  costThisPeriodUsd: number;
  atAgentCap: boolean;
  overBudget: boolean;
  /** 0..1 fraction of the compute budget consumed (clamped; 0 for unlimited). */
  budgetUsedFraction: number;
}

/**
 * Combined, read-only status — the shape a billing dashboard / Studio / "you're
 * on Free, here's your usage" UI reads. Turns the existing metering into a tier
 * picture without any enforcement side effect.
 */
export function tierStatus(input: {
  plan: string | null | undefined;
  isHouse?: boolean;
  agentCount: number;
  costThisPeriodUsd: number;
}): TierStatus {
  const limits = limitsFor(input.plan, input.isHouse);
  const budget = limits.monthlyComputeBudgetUsd;
  const budgetUsedFraction =
    Number.isFinite(budget) && budget > 0
      ? Math.min(1, Math.max(0, input.costThisPeriodUsd / budget))
      : 0;
  return {
    plan: limits.plan,
    limits,
    agentCount: input.agentCount,
    costThisPeriodUsd: input.costThisPeriodUsd,
    atAgentCap: input.agentCount >= limits.maxAgentsPerOwner,
    overBudget: input.costThisPeriodUsd >= budget,
    budgetUsedFraction,
  };
}
