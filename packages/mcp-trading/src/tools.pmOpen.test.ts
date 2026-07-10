import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { registerTools } from "./tools.js";
import type { CoinRithmClient } from "./client.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Capture every tool registered by registerTools without a live server/client.
// registerTools only references the client inside handler closures (not at
// registration time), so a bare stub is enough to inspect the input schemas.
type Registered = {
  name: string;
  config: { inputSchema: Record<string, z.ZodTypeAny>; description?: string };
};

const capture = (): Registered[] => {
  const tools: Registered[] = [];
  const server = {
    registerTool: (name: string, config: unknown) => {
      tools.push({ name, config } as Registered);
    },
  } as unknown as McpServer;
  registerTools(server, {} as unknown as CoinRithmClient);
  return tools;
};

describe("open_pm_position forecastProbability input schema", () => {
  const tool = capture().find((t) => t.name === "open_pm_position");

  it("registers the open_pm_position tool", () => {
    expect(tool).toBeDefined();
  });

  const field = () => tool!.config.inputSchema.forecastProbability;

  it("adds an OPTIONAL forecastProbability field", () => {
    expect(field()).toBeDefined();
    // Optional → omitting it parses clean (agents need not forecast).
    expect(field().safeParse(undefined).success).toBe(true);
  });

  it("accepts a forecast strictly inside (0, 100)", () => {
    for (const good of [0.5, 50, 70, 99.9]) {
      expect(field().safeParse(good).success, `${good}`).toBe(true);
    }
  });

  it("rejects the exclusive bounds and out-of-range values", () => {
    for (const bad of [0, 100, -5, 150]) {
      expect(field().safeParse(bad).success, `${bad}`).toBe(false);
    }
  });

  it("tells the agent it is their OWN estimate feeding public calibration", () => {
    const desc = field().description ?? "";
    expect(desc).toMatch(/OWN/);
    expect(desc).toMatch(/calibration/i);
  });
});

describe("report_pm_opportunity tool", () => {
  const tool = capture().find((t) => t.name === "report_pm_opportunity");

  it("is registered", () => {
    expect(tool).toBeDefined();
  });

  it("accepts exactly the three reportable kinds", () => {
    const kind = tool!.config.inputSchema.kind;
    for (const good of ["abstained", "forecast_only", "quote_expired"]) {
      expect(kind.safeParse(good).success, good).toBe(true);
    }
    for (const bad of ["opened", "risk_rejected", "validation_failed", ""]) {
      expect(kind.safeParse(bad).success, bad).toBe(false);
    }
  });

  it("bounds forecastProbability to [1,99] and makes it optional", () => {
    const fc = tool!.config.inputSchema.forecastProbability;
    expect(fc.safeParse(undefined).success).toBe(true);
    for (const good of [1, 50, 99])
      expect(fc.safeParse(good).success).toBe(true);
    for (const bad of [0, 100, -5])
      expect(fc.safeParse(bad).success).toBe(false);
  });

  it("accepts an optional cohort with universeSize + horizon", () => {
    const cohort = tool!.config.inputSchema.cohort;
    expect(cohort.safeParse(undefined).success).toBe(true);
    expect(cohort.safeParse({ universeSize: 8, horizon: "7d" }).success).toBe(
      true,
    );
    expect(cohort.safeParse({ universeSize: -1 }).success).toBe(false);
  });

  it("honestly labels itself a self-report (not independently verified)", () => {
    const desc = tool!.config.description ?? "";
    expect(desc).toMatch(/SELF-REPORT/);
    expect(desc).toMatch(/not independently verify/i);
  });
});
