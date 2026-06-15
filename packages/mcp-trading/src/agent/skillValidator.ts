import {
  ParsedSkill,
  ValidationResult,
  fail,
  VENUES,
  PROVIDERS,
  SPEC_VERSION,
  ProviderName,
  OBJECTIVE_PRIMARIES,
  ALLOWED_CAPABILITIES,
} from "./types.js";
import { parseCadenceMs, scanForSecrets } from "./util.js";

// Fail-closed skill validator. Unlike the per-decision gate (first-failure),
// this collects ALL issues so the author can fix the skill in one pass.
//
// Modes:
//   "self-host"  — model REQUIRED (no hosted free-tier locally); the policy
//                  blocks (limits/abstention/sync/killSwitch) are optional and
//                  fall back to safe defaults.
//   "hosted"     — model MAY be omitted (host supplies a free-tier model); the
//                  policy blocks MUST be present and explicit.

export type SkillValidationMode = "self-host" | "hosted";

export interface SkillValidation {
  valid: boolean;
  issues: ValidationResult[];
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isPosNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > 0;

export function validateSkill(
  parsed: ParsedSkill,
  mode: SkillValidationMode = "self-host",
): SkillValidation {
  const raw = parsed.raw;
  const issues: ValidationResult[] = [];
  const add = (code: string, reason: string) => issues.push(fail(code, reason));

  // Secrets must NEVER live in a committable skill file.
  for (const finding of scanForSecrets(raw)) add("skill_secret", finding);

  // Identity
  if (typeof raw.name !== "string" || !raw.name.trim())
    add("skill_name", "name is required (string)");
  if (typeof raw.description !== "string" || !raw.description.trim())
    add("skill_description", "description is required (string)");
  if (raw.spec !== SPEC_VERSION)
    add("skill_spec_version", `spec must be "${SPEC_VERSION}"`);

  // Trigger
  if (!isObj(raw.trigger)) {
    add("skill_trigger", "trigger block is required");
  } else if (parseCadenceMs(raw.trigger.cadence) === null) {
    add(
      "skill_cadence",
      `trigger.cadence must look like "15m" / "1h" / "4h" (got ${JSON.stringify(raw.trigger.cadence)})`,
    );
  }

  // Venues
  if (!Array.isArray(raw.venues) || raw.venues.length === 0) {
    add("skill_venues", "venues must be a non-empty list");
  } else {
    for (const v of raw.venues) {
      if (!(VENUES as readonly unknown[]).includes(v))
        add("skill_venue_unknown", `unknown venue "${String(v)}" (allowed: ${VENUES.join(", ")})`);
    }
  }

  // Risk — always required
  if (!isObj(raw.risk)) {
    add("skill_risk", "risk block is required (the caps the agent runs under)");
  } else {
    const r = raw.risk;
    if (!isPosNum(r.maxLeverage)) add("skill_risk_leverage", "risk.maxLeverage must be a positive number");
    else if ((r.maxLeverage as number) > 20)
      add("skill_risk_leverage_cap", "risk.maxLeverage cannot exceed the server cap of 20");
    if (!isPosNum(r.perTradeMarginMusd))
      add("skill_risk_margin", "risk.perTradeMarginMusd must be a positive number");
    if (!isPosNum(r.maxConcurrentPositions))
      add("skill_risk_positions", "risk.maxConcurrentPositions must be a positive number");
    if (typeof r.requireStopLoss !== "boolean")
      add("skill_risk_sl", "risk.requireStopLoss must be true or false");
    if (!Array.isArray(r.watchlist) || r.watchlist.length === 0)
      add("skill_risk_watchlist", "risk.watchlist must be a non-empty list of symbols");
  }

  // Model
  if (raw.model === undefined) {
    if (mode === "self-host")
      add(
        "skill_model_required",
        "model is required for self-host (no hosted free-tier locally). Set model.provider + model.name.",
      );
  } else if (!isObj(raw.model)) {
    add("skill_model", "model must be an object with provider + name");
  } else {
    if (!(PROVIDERS as readonly unknown[]).includes(raw.model.provider))
      add("skill_model_provider", `model.provider must be one of: ${PROVIDERS.join(", ")}`);
    if (typeof raw.model.name !== "string" || !raw.model.name.trim())
      add("skill_model_name", "model.name is required");
    if (
      raw.model.provider === ("openai-compatible" as ProviderName) &&
      (typeof raw.model.baseUrl !== "string" || !raw.model.baseUrl.trim())
    )
      add("skill_model_baseurl", "model.baseUrl is required for provider 'openai-compatible'");
  }

  // objective (optional)
  if (raw.objective !== undefined) {
    if (!isObj(raw.objective)) {
      add("skill_objective", "objective must be an object");
    } else if (
      typeof raw.objective.primary !== "string" ||
      !(OBJECTIVE_PRIMARIES as readonly unknown[]).includes(raw.objective.primary)
    ) {
      add(
        "skill_objective_primary",
        `objective.primary must be one of: ${OBJECTIVE_PRIMARIES.join(", ")}`,
      );
    }
  }

  // capabilities (optional, opt-in, reserved for a later slice)
  if (raw.capabilities !== undefined) {
    if (!Array.isArray(raw.capabilities)) {
      add("skill_capabilities", "capabilities must be a list");
    } else {
      for (const c of raw.capabilities) {
        if (!(ALLOWED_CAPABILITIES as readonly unknown[]).includes(c)) {
          add(
            "skill_capability_unknown",
            `unknown capability "${String(c)}" (allowed: ${ALLOWED_CAPABILITIES.join(", ")})`,
          );
        }
      }
    }
  }

  // Hosted mode: the safety policy blocks must be explicit.
  if (mode === "hosted") {
    if (!isObj(raw.limits)) {
      add("skill_limits_required", "limits block is required in hosted mode");
    } else {
      const l = raw.limits;
      if (!isPosNum(l.maxTradesPerDay)) add("skill_limits_trades", "limits.maxTradesPerDay must be a positive number");
      if (!isPosNum(l.maxWritesPerCycle)) add("skill_limits_writes", "limits.maxWritesPerCycle must be a positive number");
      if (!isPosNum(l.maxDailyLossMusd)) add("skill_limits_loss", "limits.maxDailyLossMusd must be a positive number");
      if (!isPosNum(l.maxOpenMarginMusd)) add("skill_limits_open", "limits.maxOpenMarginMusd must be a positive number");
    }
    if (!isObj(raw.abstention))
      add("skill_abstention_required", "abstention block is required in hosted mode");
    if (!isObj(raw.sync)) {
      add("skill_sync_required", "sync block is required in hosted mode");
    } else if (typeof raw.sync.requirePollBeforeWrite !== "boolean") {
      add("skill_sync_poll", "sync.requirePollBeforeWrite must be true or false");
    }
    if (!isObj(raw.killSwitch))
      add("skill_killswitch_required", "killSwitch block is required in hosted mode");
  }

  return { valid: issues.length === 0, issues };
}
