import { describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { registerTools } from "./tools.js";
import type { CoinRithmClient } from "./client.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Capture every tool registered by registerTools without a live server, then
// invoke each new pm_data_* read tool against a stub client that only tracks
// which public* method it was called with — mirrors tools.pmOpen.test.ts's
// capture() pattern, plus a call-through check that each tool calls the
// keyless public* client method (never a keyed /api/agent/* method).
type Registered = {
  name: string;
  config: {
    inputSchema: Record<string, z.ZodTypeAny>;
    description?: string;
    annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
  };
  handler: (args: Record<string, unknown>, extra: unknown) => unknown;
};

const capture = (client: Partial<CoinRithmClient>): Registered[] => {
  const tools: Registered[] = [];
  const server = {
    registerTool: (name: string, config: unknown, handler: unknown) => {
      tools.push({
        name,
        config: config as Registered["config"],
        handler: handler as Registered["handler"],
      });
    },
  } as unknown as McpServer;
  registerTools(server, client as unknown as CoinRithmClient);
  return tools;
};

const NEW_PUBLIC_DATA_TOOLS = [
  "pm_data_sources",
  "pm_data_sources_health",
  "pm_data_disagreements",
  "pm_data_calibration",
  "pm_data_canonical",
  "pm_data_volume_history",
] as const;

describe("new keyless pm_data_* read tools", () => {
  it("are all registered as read-only, non-destructive tools", () => {
    const tools = capture({});
    for (const name of NEW_PUBLIC_DATA_TOOLS) {
      const tool = tools.find((t) => t.name === name);
      expect(tool, `${name} not registered`).toBeDefined();
      expect(tool!.config.annotations?.readOnlyHint).toBe(true);
      expect(tool!.config.annotations?.destructiveHint).toBe(false);
      expect(tool!.config.description).toContain("No API key required");
    }
  });

  it("pm_data_disagreements calls the keyless getPublicPmMatches client method", async () => {
    const getPublicPmMatches = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, data: { data: [] } });
    const tool = capture({
      getPublicPmMatches,
    } as unknown as Partial<CoinRithmClient>).find(
      (t) => t.name === "pm_data_disagreements",
    )!;

    await tool.handler({ limit: 5, sourceKind: "market" }, {});

    expect(getPublicPmMatches).toHaveBeenCalledTimes(1);
    expect(getPublicPmMatches).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, sourceKind: "market" }),
    );
  });

  it("source methodology and health tools call only keyless public methods", async () => {
    const getPublicPmSources = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, data: { sources: [] } });
    const getPublicPmSourcesHealth = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, data: { sources: [] } });
    const tools = capture({
      getPublicPmSources,
      getPublicPmSourcesHealth,
    } as unknown as Partial<CoinRithmClient>);

    await tools
      .find((tool) => tool.name === "pm_data_sources")!
      .handler({ fiat: "EUR" }, {});
    await tools
      .find((tool) => tool.name === "pm_data_sources_health")!
      .handler({}, {});

    expect(getPublicPmSources).toHaveBeenCalledWith({ fiat: "EUR" });
    expect(getPublicPmSourcesHealth).toHaveBeenCalledWith();
  });

  it("pm_data_calibration calls the keyless getPublicPmCalibration client method with no args", async () => {
    const getPublicPmCalibration = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, data: { scored: [] } });
    const tool = capture({
      getPublicPmCalibration,
    } as unknown as Partial<CoinRithmClient>).find(
      (t) => t.name === "pm_data_calibration",
    )!;

    await tool.handler({}, {});

    expect(getPublicPmCalibration).toHaveBeenCalledTimes(1);
    expect(getPublicPmCalibration).toHaveBeenCalledWith();
  });

  it("pm_data_canonical lists when key is omitted and fetches detail when key is given", async () => {
    const getPublicPmCanonicalList = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, data: { data: [] } });
    const getPublicPmCanonicalDetail = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, data: { canonical: {} } });
    const tool = capture({
      getPublicPmCanonicalList,
      getPublicPmCanonicalDetail,
    } as unknown as Partial<CoinRithmClient>).find(
      (t) => t.name === "pm_data_canonical",
    )!;

    await tool.handler({ limit: 25 }, {});
    expect(getPublicPmCanonicalList).toHaveBeenCalledTimes(1);
    expect(getPublicPmCanonicalDetail).not.toHaveBeenCalled();

    await tool.handler({ key: "some-canonical-slug" }, {});
    expect(getPublicPmCanonicalDetail).toHaveBeenCalledWith(
      "some-canonical-slug",
    );
    expect(getPublicPmCanonicalList).toHaveBeenCalledTimes(1);
  });

  it("pm_data_volume_history calls the keyless getPublicPmVolumeHistory client method with no args", async () => {
    const getPublicPmVolumeHistory = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, data: { days: [] } });
    const tool = capture({
      getPublicPmVolumeHistory,
    } as unknown as Partial<CoinRithmClient>).find(
      (t) => t.name === "pm_data_volume_history",
    )!;

    await tool.handler({}, {});

    expect(getPublicPmVolumeHistory).toHaveBeenCalledTimes(1);
    expect(getPublicPmVolumeHistory).toHaveBeenCalledWith();
  });
});
