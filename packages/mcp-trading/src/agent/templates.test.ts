import { describe, it, expect } from "vitest";
import {
  renderFolderOfOne,
  buildAgentObject,
  PRESET_NAMES,
} from "./templates.js";
import { parseSkill, buildSpec } from "./skill.js";
import { validateSkill } from "./skillValidator.js";
import { scanForSecrets } from "./util.js";

describe("templates / presets", () => {
  for (const preset of PRESET_NAMES) {
    it(`${preset}: renders, parses, and validates self-host AND hosted`, () => {
      const parsed = parseSkill(renderFolderOfOne("my-agent", preset));
      expect(validateSkill(parsed, "self-host").valid).toBe(true);
      expect(validateSkill(parsed, "hosted").valid).toBe(true);
    });
    it(`${preset}: contains no secrets`, () => {
      const parsed = parseSkill(renderFolderOfOne("my-agent", preset));
      expect(scanForSecrets(parsed.raw)).toHaveLength(0);
      expect(scanForSecrets(parsed.body)).toHaveLength(0);
    });
  }

  it("every preset is paper-safe + server-cap compliant", () => {
    for (const preset of PRESET_NAMES) {
      const s = buildSpec(buildAgentObject("a", preset).frontmatter);
      expect(s.risk.requireStopLoss).toBe(true);
      expect(s.risk.maxLeverage).toBeLessThanOrEqual(20);
      expect(s.sync.requirePollBeforeWrite).toBe(true);
      expect(s.killSwitch.onRateLimitPressure).toBe(true);
      expect(s.killSwitch.maxDrawdownMusd).toBeGreaterThan(0);
    }
  });

  it("conservative <= balanced <= bold within safe ranges", () => {
    const [c, b, x] = PRESET_NAMES.map((p) => buildSpec(buildAgentObject("a", p).frontmatter));
    expect(c.risk.maxLeverage).toBeLessThanOrEqual(b.risk.maxLeverage);
    expect(b.risk.maxLeverage).toBeLessThanOrEqual(x.risk.maxLeverage);
    expect(c.risk.perTradeMarginMusd).toBeLessThanOrEqual(x.risk.perTradeMarginMusd);
    expect(c.limits.maxDailyLossMusd).toBeLessThanOrEqual(x.limits.maxDailyLossMusd);
  });
});
