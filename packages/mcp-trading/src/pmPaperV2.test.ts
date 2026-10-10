import { afterEach, describe, expect, it, vi } from "vitest";
import { pmPaperOpenSchema, pmPaperCloseSchema } from "./pmPaperV2.js";
import { registerTools } from "./tools.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CoinRithmClient } from "./client.js";
import { CoinRithmClient as RunnerClient } from "./agent/client.js";
const open = {
  source: "kalshi",
  slug: "fixture",
  outcomeExternalMarketId: "fixture-YES",
  side: "no",
  maxCashBudget: "10.123456789012345678",
  idempotencyKey: "pm-entry:fixture",
} as const;
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("both real clients preserve exact entry, replay-only misses, and open-page queries", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const mcp = new CoinRithmClient({
    baseUrl: "https://fixture.example.test",
    apiKey: "fixture-key",
  });
  const runner = new RunnerClient({
    baseUrl: "https://fixture.example.test",
    apiKey: "fixture-key",
  });
  for (const client of [mcp, runner]) {
    fetch.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            executionModel: "pm_paper_v2",
            accepted: true,
            executed: true,
            positionId: 1,
            replayed: false,
          }),
          { status: 200 },
        ),
    );
    expect((await client.openPmPaperV2(open)).ok).toBe(true);
    expect(fetch.mock.lastCall?.[0]).toBe(
      "https://fixture.example.test/api/agent/pm/v2/open",
    );
    expect(JSON.parse(fetch.mock.lastCall?.[1].body)).toEqual(open);
    const missing = {
      executionModel: "pm_paper_v2",
      accepted: false,
      executed: false,
      reason: "no_existing_receipt",
      replayMissing: true,
    };
    fetch.mockImplementation(
      async () => new Response(JSON.stringify(missing), { status: 404 }),
    );
    const replay = await client.replayPmPaperV2Open(open);
    expect(replay).toMatchObject({ ok: false, status: 404, data: missing });
    expect(fetch.mock.lastCall?.[0]).toBe(
      "https://fixture.example.test/api/agent/pm/v2/open/replay",
    );
    expect(JSON.parse(fetch.mock.lastCall?.[1].body)).toEqual(open);
  }
  const view = {
    executionModel: "pm_paper_v2",
    positions: [],
    hasMore: false,
    nextBeforeId: null,
    entryEnabled: false,
    configuredHouse: null,
  };
  fetch.mockImplementation(async () => new Response(JSON.stringify(view)));
  const query = { status: "open" as const, limit: 50, beforeId: 12 };
  for (const response of [
    await mcp.pmPaperV2Positions(undefined, query),
    await runner.pmPaperV2Positions(query),
  ]) {
    expect(response.data).toEqual(view);
  }
  for (const call of fetch.mock.calls.slice(-2)) {
    const url = new URL(call[0]);
    expect(url.pathname).toBe("/api/agent/pm/v2/positions");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      status: "open",
      limit: "50",
      beforeId: "12",
    });
  }
  expect((await mcp.pmPaperV2Positions()).data).toEqual(view);
  expect((await runner.pmPaperV2Positions()).data).toEqual(view);
});
describe("explicit PM v2 consumer wire contract", () => {
  it("preserves decimals and explicit nulls", () => {
    const body = {
      ...open,
      forecastProbability: null,
      minEntryProbabilityPct: "0",
      thesis: null,
    };
    expect(pmPaperOpenSchema.parse(body)).toEqual(body);
  });
  it.each([
    10,
    "1e2",
    " 10",
    "01",
    "9.999999999999999999",
    "1000000.000000000000000001",
    "10.0000000000000000001",
  ])("rejects inexact/invalid budget %s", (value) => {
    expect(
      pmPaperOpenSchema.safeParse({ ...open, maxCashBudget: value }).success,
    ).toBe(false);
  });
  it("rejects caller-selected accounting/ownership and legacy stake", () => {
    for (const fields of [
      { executionModel: "legacy" },
      { walletId: 1 },
      { stakeMusd: 10 },
    ])
      expect(pmPaperOpenSchema.safeParse({ ...open, ...fields }).success).toBe(
        false,
      );
  });
  it("requires full close with stable scoped identity", () => {
    expect(
      pmPaperCloseSchema.parse({
        positionId: 1,
        idempotencyKey: "pm-exit:fixture",
        detail: null,
      }),
    ).toEqual({
      positionId: 1,
      idempotencyKey: "pm-exit:fixture",
      detail: null,
    });
    for (const fields of [
      { fraction: 0.5 },
      { positionId: 2147483648 },
      { idempotencyKey: "legacy" },
      { detail: "bad\ntext" },
    ])
      expect(
        pmPaperCloseSchema.safeParse({
          positionId: 1,
          idempotencyKey: "pm-exit:fixture",
          ...fields,
        }).success,
      ).toBe(false);
  });
  it("bounds forecasts exactly without Float rounding", () => {
    expect(
      pmPaperOpenSchema.safeParse({
        ...open,
        forecastProbability: "99.999999999999999999",
      }).success,
    ).toBe(true);
    expect(
      pmPaperOpenSchema.safeParse({ ...open, forecastProbability: "100" })
        .success,
    ).toBe(false);
  });
  it.each([202, 200, 409])(
    "both clients retain actual execution result for HTTP %s",
    async (status) => {
      const result = {
        executionModel: "pm_paper_v2",
        accepted: status !== 409,
        executed: status === 200,
        positionId: 1,
        intent: {
          id: "intent",
          status:
            status === 200
              ? "filled"
              : status === 409
                ? "cancelled"
                : "pending",
        },
      };
      const fetch = vi
        .fn()
        .mockImplementation(
          async () => new Response(JSON.stringify(result), { status }),
        );
      vi.stubGlobal("fetch", fetch);
      const mcp = new CoinRithmClient({
        baseUrl: "https://fixture.example.test",
        apiKey: "fixture-key",
      });
      const runner = new RunnerClient({
        baseUrl: "https://fixture.example.test",
        apiKey: "fixture-key",
      });
      const close = { positionId: 1, idempotencyKey: "pm-exit:fixture" };
      for (const client of [mcp, runner]) {
        const response = await client.closePmPaperV2(close);
        expect(response.data).toEqual(result);
        expect(fetch.mock.lastCall?.[0]).toBe(
          "https://fixture.example.test/api/agent/pm/v2/close",
        );
        expect(JSON.parse(fetch.mock.lastCall?.[1].body)).toEqual(close);
      }
    },
  );
});

it("registered tools pass per-request key and preserve pending receipt", async () => {
  vi.stubEnv("COINRITHM_PM_PAPER_V2_TOOLS_ENABLED", "true");
  const pending = {
    ok: true,
    status: 202,
    data: {
      executionModel: "pm_paper_v2",
      accepted: true,
      executed: false,
      intent: { id: "fixture", status: "pending" },
    },
  };
  const client = {
    openPmPaperV2: vi.fn().mockResolvedValue(pending),
    closePmPaperV2: vi.fn().mockResolvedValue(pending),
    pmPaperV2Positions: vi.fn().mockResolvedValue(pending),
  };
  const handlers = new Map<
    string,
    (body: unknown, extra: unknown) => Promise<unknown>
  >();
  registerTools(
    {
      registerTool: (
        name: string,
        _config: unknown,
        handler: (body: unknown, extra: unknown) => Promise<unknown>,
      ) => handlers.set(name, handler),
    } as unknown as McpServer,
    client as unknown as CoinRithmClient,
  );
  const extra = {
    requestInfo: { headers: { authorization: "Bearer request-fixture" } },
  };
  await handlers.get("open_pm_paper_v2")!(open, extra);
  expect(client.openPmPaperV2).toHaveBeenCalledWith(open, "request-fixture");
  const close = { positionId: 1, idempotencyKey: "pm-exit:fixture" };
  const response = await handlers.get("close_pm_paper_v2")!(close, extra);
  expect(client.closePmPaperV2).toHaveBeenCalledWith(close, "request-fixture");
  expect(JSON.stringify(response)).toContain('"executed":false');
  await handlers.get("get_pm_paper_v2_positions")!({}, extra);
  expect(client.pmPaperV2Positions).toHaveBeenCalledWith("request-fixture", {});
});

it("default tool list does not advertise PM v2", () => {
  vi.stubEnv("COINRITHM_PM_PAPER_V2_TOOLS_ENABLED", undefined);
  const names: string[] = [];
  registerTools(
    {
      registerTool: (name: string) => names.push(name),
    } as unknown as McpServer,
    {} as CoinRithmClient,
  );
  expect(names).toContain("open_pm_position");
  expect(names).not.toContain("open_pm_paper_v2");
  expect(names).not.toContain("close_pm_paper_v2");
});
