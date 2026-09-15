import { describe, expect, it } from "vitest";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { validateSkill } from "./skillValidator.js";

const fixture = () => parseSkill(renderFolderOfOne("fixture", "conservative"));

describe("skill authoring rejects malformed policies before execution", () => {
  it.each([
    ["name", "", "skill_name"],
    ["name", 7, "skill_name"],
    ["description", " ", "skill_description"],
    ["description", null, "skill_description"],
    ["spec", "future-version", "skill_spec_version"],
    ["trigger", null, "skill_trigger"],
    ["trigger.cadence", "soon", "skill_cadence"],
    ["venues", null, "skill_venues"],
    ["venues", [], "skill_venues"],
    ["venues", ["unknown"], "skill_venue_unknown"],
    ["risk", [], "skill_risk"],
    ["risk.maxLeverage", 0, "skill_risk_leverage"],
    ["risk.maxLeverage", 21, "skill_risk_leverage_cap"],
    ["risk.perTradeMarginMusd", Infinity, "skill_risk_margin"],
    ["risk.maxConcurrentPositions", "3", "skill_risk_positions"],
    ["risk.requireStopLoss", "false", "skill_risk_sl"],
    ["risk.watchlist", [], "skill_risk_watchlist"],
    ["risk.watchlist", "BTC", "skill_risk_watchlist"],
    ["model", null, "skill_model"],
    ["model", { provider: "unknown", name: "fixture" }, "skill_model_provider"],
    ["model.name", " ", "skill_model_name"],
    ["model.name", null, "skill_model_name"],
    [
      "model",
      { provider: "openai-compatible", name: "fixture" },
      "skill_model_baseurl",
    ],
    [
      "model",
      { provider: "openai-compatible", name: "fixture", baseUrl: " " },
      "skill_model_baseurl",
    ],
    ["objective", [], "skill_objective"],
    ["objective", { primary: "unknown" }, "skill_objective_primary"],
    ["objective", {}, "skill_objective_primary"],
    ["capabilities", "unknown", "skill_capabilities"],
    ["capabilities", ["unknown"], "skill_capability_unknown"],
    ["limits", null, "skill_limits_required"],
    ["limits.maxTradesPerDay", -1, "skill_limits_trades"],
    ["limits.maxWritesPerCycle", 0, "skill_limits_writes"],
    ["limits.maxDailyLossMusd", NaN, "skill_limits_loss"],
    ["limits.maxOpenMarginMusd", null, "skill_limits_open"],
    ["abstention", null, "skill_abstention_required"],
    ["sync", null, "skill_sync_required"],
    ["sync.requirePollBeforeWrite", "yes", "skill_sync_poll"],
    ["killSwitch", false, "skill_killswitch_required"],
  ])("rejects %s=%j with %s", (path, value, code) => {
    const parsed = fixture();
    const keys = String(path).split(".");
    let target = parsed.raw;
    for (const key of keys.slice(0, -1))
      target = target[key] as Record<string, unknown>;
    target[keys.at(-1)!] = value;
    const result = validateSkill(parsed, "hosted");
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code })]),
    );
  });

  it("requires a self-host model while permitting the hosted default", () => {
    const parsed = fixture();
    delete parsed.raw.model;
    expect(validateSkill(parsed).issues).toContainEqual(
      expect.objectContaining({ code: "skill_model_required" }),
    );
    expect(validateSkill(parsed, "hosted")).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("accepts an explicit compatible endpoint and unlimited daily trade sentinel", () => {
    const parsed = fixture();
    parsed.raw.model = {
      provider: "openai-compatible",
      name: "fixture",
      baseUrl: "https://fixture.invalid/v1",
    };
    (parsed.raw.limits as Record<string, unknown>).maxTradesPerDay = 0;
    expect(validateSkill(parsed, "hosted")).toEqual({
      valid: true,
      issues: [],
    });
  });
});
