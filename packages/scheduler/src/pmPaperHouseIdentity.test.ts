import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { decrypt } from "./crypto.js";
import {
  planPmPaperHouse,
  provisionPmPaperHouse,
  type PmHousePlanInput,
} from "./pmPaperHouseIdentity.js";

const master = Buffer.alloc(32, 19);
function input(): PmHousePlanInput {
  return {
    handle: "pm-v2-controlled-fixture",
    displayName: "Controlled fixture",
    agentPublic: false,
    target: {
      database: "isolated_proof",
      systemIdentifier: "123456789",
      serverVersionNum: 170010,
    },
    raw: {
      name: "controlled-fixture",
      description: "Controlled paper-only test definition",
      spec: "coinrithm.agent.v1",
      trigger: { cadence: "10m", timezone: "UTC" },
      model: { provider: "openai", name: "fixture-model" },
      venues: ["pm"],
      risk: {
        maxLeverage: 1,
        perTradeMarginMusd: 10,
        maxConcurrentPositions: 1,
        requireStopLoss: false,
        watchlist: ["BTC"],
      },
      limits: {
        maxTradesPerDay: 1,
        maxWritesPerCycle: 1,
        maxDailyLossMusd: 10,
        maxOpenMarginMusd: 10,
      },
      abstention: {
        onStaleData: true,
        onWeakSignal: true,
        onMissingQuote: true,
        onInsufficientBalance: true,
        minConfidence: 0.7,
      },
      sync: { requirePollBeforeWrite: true },
      killSwitch: {
        maxDrawdownMusd: 10,
        maxConsecutiveRejects: 3,
        maxConsecutiveModelFailures: 3,
        onRateLimitPressure: true,
      },
    },
    prose:
      "Controlled fixture only. Skip all decisions. No strategy activation.",
  };
}

function harness(
  options: {
    role?: string;
    fail?: string;
    collision?: boolean;
    targetMismatch?: boolean;
    commitFails?: boolean;
  } = {},
) {
  let agent: Record<string, unknown> | undefined;
  let identityRow: Record<string, unknown> | undefined;
  const release = vi.fn();
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    if (options.fail && sql.includes(options.fail))
      throw new Error("unsafe parameter crk_live_secret");
    if (sql === "SELECT current_user AS role")
      return {
        rows: [{ role: options.role ?? "proof_operator" }],
        rowCount: 1,
      };
    if (sql.includes("pg_control_system"))
      return {
        rows: [
          {
            role: options.role ?? "proof_operator",
            database: options.targetMismatch ? "wrong" : "isolated_proof",
            version: 170010,
            system: "123456789",
          },
        ],
        rowCount: 1,
      };
    if (sql.includes('FROM public."Coin"'))
      return { rows: [{ ucid: "825" }], rowCount: 1 };
    if (sql.startsWith("SELECT * FROM agent_runtime.agents"))
      return { rows: agent ? [agent] : [], rowCount: agent ? 1 : 0 };
    if (sql.startsWith('SELECT id FROM public."User"'))
      return {
        rows: options.collision ? [{ id: 88 }] : [],
        rowCount: options.collision ? 1 : 0,
      };
    if (sql.startsWith('INSERT INTO public."User"')) {
      identityRow = {
        email: params[0],
        password: params[1],
        username: params[2],
        signupMethod: params[3],
        emailVerified: null,
        user_active: true,
      };
      return { rows: [{ id: 101 }], rowCount: 1 };
    }
    if (sql.startsWith('INSERT INTO public."ApiKey"')) {
      Object.assign(identityRow!, {
        keyPrefix: params[1],
        keyHash: params[2],
        agentPublic: params[4],
        scopes: ["read", "trade:pm"],
        revokedAt: null,
      });
      return { rows: [{ id: 201 }], rowCount: 1 };
    }
    if (sql.startsWith('INSERT INTO public."Wallet"')) {
      Object.assign(identityRow!, {
        wallet_active: true,
        type: "mock_spot",
        startingEquityMusd: 50000,
      });
      return { rows: [{ id: 301 }], rowCount: 1 };
    }
    if (sql.startsWith('INSERT INTO public."WalletAsset"')) {
      Object.assign(identityRow!, { asset_id: 401 });
      return { rows: [{ id: 401 }], rowCount: 1 };
    }
    if (sql.startsWith("INSERT INTO agent_runtime.agents")) {
      agent = {
        id: "501",
        owner_user_id: params[0],
        handle: params[1],
        display_name: params[2],
        status: "paused",
        live: false,
        is_house: true,
        cadence_seconds: params[3],
        model_provider: params[4],
        model_name: params[5],
        model_base_url: params[6],
        spec: JSON.parse(String(params[7])),
        prose: params[8],
        manifest: JSON.parse(String(params[9])),
        coinrithm_key_enc: params[10],
        plan: "house",
      };
      return { rows: [{ id: "501" }], rowCount: 1 };
    }
    if (sql.startsWith("SELECT u.email"))
      return { rows: [identityRow!], rowCount: 1 };
    if (sql.startsWith("SELECT agent_id"))
      return { rows: [{ agent_id: "501" }], rowCount: 1 };
    if (sql.startsWith('SELECT id FROM public."Account"'))
      return { rows: [], rowCount: 0 };
    if (sql === "COMMIT" && options.commitFails)
      throw new Error("connection lost");
    return { rows: [], rowCount: 1 };
  });
  const pool = {
    connect: vi.fn(async () => ({ query, release })),
  } as unknown as Pool;
  return {
    pool,
    query,
    release,
    agent: () => agent!,
    identityRow: () => identityRow!,
  };
}

describe("PM house create-only operator plan", () => {
  it("pins explicit definition/target and paused non-live initial state", () => {
    const p = planPmPaperHouse(input());
    expect(p).toMatchObject({
      email: "pm-v2-controlled-fixture@paper-agents.coinrithm.invalid",
      startingEquityMusd: 50000,
      cashCoinId: "825",
      initialStatus: "paused",
      initialLive: false,
      entryEnabled: false,
      cadenceSeconds: 600,
    });
    expect(p.planHash).toMatch(/^[a-f0-9]{64}$/);
    const shuffled = input();
    shuffled.raw = Object.fromEntries(Object.entries(shuffled.raw).reverse());
    expect(planPmPaperHouse(shuffled).planHash).toBe(p.planHash);
    expect(
      planPmPaperHouse({ ...input(), agentPublic: true }).planHash,
    ).not.toBe(p.planHash);
  });
  it.each([
    "olivia-pm",
    "pm-v2-",
    "pm-v2-A",
    "pm-v2-a/b",
    "pm-v2-" + "x".repeat(50),
  ])("rejects handle %s", (handle) =>
    expect(() => planPmPaperHouse({ ...input(), handle })).toThrow(
      "invalid_new_house_handle",
    ),
  );
  it("requires explicit PM-only validated model and public choice", () => {
    for (const patch of [
      { venues: ["pm", "futures"] },
      { model: undefined },
      { model: { provider: "mechanical", name: "random" } },
      { limits: null },
    ]) {
      const value = input();
      Object.assign(value.raw, patch);
      expect(() => planPmPaperHouse(value)).toThrow();
    }
    expect(() =>
      planPmPaperHouse({ ...input(), agentPublic: undefined as never }),
    ).toThrow();
  });
  it("does not let the spec builder supply an omitted model choice", () => {
    const missing = input();
    delete missing.raw.model;
    expect(() => planPmPaperHouse(missing)).toThrow("explicit_model_required");
    missing.raw.model = { name: "fixture-model" };
    expect(() => planPmPaperHouse(missing)).toThrow("explicit_model_required");
    missing.raw.model = { provider: "openai" };
    expect(() => planPmPaperHouse(missing)).toThrow("explicit_model_required");
  });
  it("rejects non-json/nonfinite/oversized data and wrong target generation", () => {
    const v = input();
    v.raw.extra = Infinity;
    expect(() => planPmPaperHouse(v)).toThrow("invalid_plan_json");
    expect(() =>
      planPmPaperHouse({ ...input(), prose: "x".repeat(140000) }),
    ).toThrow("plan_too_large");
    expect(() =>
      planPmPaperHouse({
        ...input(),
        target: { ...input().target, serverVersionNum: 160000 },
      }),
    ).toThrow("invalid_target");
  });
});

describe("PM house operator transaction", () => {
  it("creates all rows atomically, hashes/encrypts only in memory and returns no secret", async () => {
    const h = harness();
    const p = planPmPaperHouse(input());
    const result = await provisionPmPaperHouse(h.pool, p, p.planHash, master);
    expect(result).toEqual({
      action: "created",
      planHash: p.planHash,
      identity: {
        userId: 101,
        apiKeyId: 201,
        walletId: 301,
        houseAgentId: 501,
      },
      enrollmentApplied: false,
      provisioningOnly: true,
      initialEntryEnabled: false,
      currentEnrollment: "not_read",
      status: "paused",
      live: false,
    });
    const raw = decrypt(String(h.agent().coinrithm_key_enc), master);
    const core = raw.slice(0, raw.lastIndexOf("_"));
    expect(raw.slice(raw.lastIndexOf("_") + 1)).toBe(
      createHash("sha256").update(core).digest("hex").slice(0, 6),
    );
    expect(h.identityRow().keyHash).toBe(
      createHash("sha256").update(raw).digest("hex"),
    );
    expect(JSON.stringify(result)).not.toContain("crk_live_");
    expect(JSON.stringify(h.query.mock.calls)).not.toContain(raw);
    const sql = h.query.mock.calls.map(([q]) => q);
    expect(sql[0]).toBe("BEGIN");
    expect(sql.at(-1)).toBe("COMMIT");
    expect(sql.join("\n")).not.toMatch(
      /ON CONFLICT|UPDATE public|CREATE TABLE/,
    );
    expect(sql.filter((q) => q.startsWith("INSERT"))).toHaveLength(6);
    expect(h.release).toHaveBeenCalledWith(false);
  });
  it("exact replay preserves progressed state/status and revoked key without writes", async () => {
    const h = harness();
    const p = planPmPaperHouse(input());
    await provisionPmPaperHouse(h.pool, p, p.planHash, master);
    h.agent().status = "disabled";
    h.agent().live = true;
    h.identityRow().revokedAt = new Date();
    h.query.mockClear();
    const result = await provisionPmPaperHouse(h.pool, p, p.planHash, master);
    expect(result).toMatchObject({
      action: "replayed",
      status: "disabled",
      live: true,
    });
    expect(
      h.query.mock.calls.some(([q]) => /^(INSERT|UPDATE|DELETE)/.test(q)),
    ).toBe(false);
  });
  it.each(["coinrithm_scheduler", "coinrithm_app"])(
    "refuses runtime role %s before insert",
    async (role) => {
      const h = harness({ role });
      const p = planPmPaperHouse(input());
      await expect(
        provisionPmPaperHouse(h.pool, p, p.planHash, master),
      ).rejects.toThrow();
      expect(h.query.mock.calls.some(([q]) => q.startsWith("INSERT"))).toBe(
        false,
      );
    },
  );
  it.each([{ targetMismatch: true }, { collision: true }])(
    "refuses mismatched target/existing user without DML",
    async (opts) => {
      const h = harness(opts);
      const p = planPmPaperHouse(input());
      await expect(
        provisionPmPaperHouse(h.pool, p, p.planHash, master),
      ).rejects.toThrow();
      expect(h.query.mock.calls.some(([q]) => q.startsWith("INSERT"))).toBe(
        false,
      );
      expect(h.query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    },
  );
  it("binds reviewed hash before any DB call and rejects mutated plan fields", async () => {
    const h = harness();
    const p = planPmPaperHouse(input());
    await expect(
      provisionPmPaperHouse(h.pool, p, "0".repeat(64), master),
    ).rejects.toThrow("reviewed_plan_mismatch");
    await expect(
      provisionPmPaperHouse(
        h.pool,
        { ...p, initialLive: true as never },
        p.planHash,
        master,
      ),
    ).rejects.toThrow("reviewed_plan_mismatch");
    expect(h.pool.connect).not.toHaveBeenCalled();
  });
  it("rejects a changed plan on existing handle rather than updating definition", async () => {
    const h = harness();
    const p = planPmPaperHouse(input());
    await provisionPmPaperHouse(h.pool, p, p.planHash, master);
    h.query.mockClear();
    const changed = planPmPaperHouse({ ...input(), displayName: "Different" });
    await expect(
      provisionPmPaperHouse(h.pool, changed, changed.planHash, master),
    ).rejects.toThrow("existing_handle_conflict");
    expect(
      h.query.mock.calls.some(([q]) => /^(INSERT|UPDATE|DELETE)/.test(q)),
    ).toBe(false);
  });
  it.each(["owner", "definition", "envelope", "identity", "keyhash"])(
    "rejects persisted %s drift without repair",
    async (change) => {
      const h = harness();
      const p = planPmPaperHouse(input());
      await provisionPmPaperHouse(h.pool, p, p.planHash, master);
      h.query.mockClear();
      if (change === "owner") h.agent().owner_user_id = 999;
      if (change === "definition") h.agent().prose = "changed";
      if (change === "envelope") h.agent().coinrithm_key_enc = "invalid";
      if (change === "identity") h.identityRow().email = "somebody@example.com";
      if (change === "keyhash") h.identityRow().keyHash = "f".repeat(64);
      await expect(
        provisionPmPaperHouse(h.pool, p, p.planHash, master),
      ).rejects.toThrow();
      expect(
        h.query.mock.calls.some(([q]) => /^(INSERT|UPDATE|DELETE)/.test(q)),
      ).toBe(false);
    },
  );
  it("rolls back a late failure and exposes only a safe code", async () => {
    const h = harness({ fail: "INSERT INTO agent_runtime.agent_state" });
    const p = planPmPaperHouse(input());
    await expect(
      provisionPmPaperHouse(h.pool, p, p.planHash, master),
    ).rejects.toThrow("operator_transaction_failed");
    expect(h.query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
  });
  it("never automatically retries an ambiguous commit", async () => {
    const h = harness({ commitFails: true });
    const p = planPmPaperHouse(input());
    await expect(
      provisionPmPaperHouse(h.pool, p, p.planHash, master),
    ).rejects.toThrow("commit_outcome_unknown_reconcile_same_plan");
    expect(h.query.mock.calls.filter(([q]) => q === "COMMIT")).toHaveLength(1);
    expect(h.release).toHaveBeenCalledWith(true);
  });
});
