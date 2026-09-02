import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import {
  coolDownProviderCapacity,
  isProviderRouteCoolingDown,
  releaseProviderCapacity,
  reserveProviderCapacity,
} from "./capacity.js";

function mockPool(updateRows: unknown[] = [{ route_key: "nvidia:shared:0" }]) {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes("RETURNING b.route_key")) return { rows: updateRows };
    if (sql.includes("RETURNING reserved_tokens")) {
      return { rows: [{ reserved_tokens: 12_000 }] };
    }
    return { rows: [], rowCount: 1 };
  });
  const client = { query, release: vi.fn() };
  return {
    pool: { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool,
    query,
    release: client.release,
  };
}

const limit = {
  routeKey: "nvidia:shared:0",
  provider: "nvidia",
  model: "nvidia/nemotron-3-super-120b-a12b",
  requestsPerMinute: 15,
  tokensPerMinute: 100_000,
  maxConcurrent: 4,
  reserveTokens: 12_000,
  leaseTtlSeconds: 360,
};

describe("shared provider capacity", () => {
  it("atomically reserves RPM, TPM and concurrency without holding DB during the call", async () => {
    const db = mockPool();
    const lease = await reserveProviderCapacity(db.pool, limit);
    expect(lease).toMatchObject({
      routeKey: limit.routeKey,
      reservedTokens: 12_000,
    });
    const sql = db.query.mock.calls.map((c) => String(c[0])).join("\n");
    expect(sql).toContain("request_tokens");
    expect(sql).toContain("model_tokens");
    expect(sql).toContain("max_concurrent");
    expect(sql).toContain("blocked_until");
    expect(sql).toContain("clock_timestamp()");
    expect(sql).toContain("provider_capacity_leases");
    expect(sql).toContain("VALUES ($1, $2, 0, 0, $3, $4, $5)");
    expect(db.query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
    expect(db.release).toHaveBeenCalledOnce();
  });

  it("shares a bounded Retry-After cooldown across scheduler replicas", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    const pool = { query } as unknown as Pool;
    await coolDownProviderCapacity(
      pool,
      limit.routeKey,
      limit.provider,
      limit.model,
      90_000,
    );
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("provider_route_cooldowns");
    expect(sql).toContain("last_failure_class");
    expect(params).toEqual([
      limit.routeKey,
      limit.provider,
      limit.model,
      90_000,
      "rate_limit",
    ]);

    query.mockClear();
    await coolDownProviderCapacity(
      pool,
      limit.routeKey,
      limit.provider,
      limit.model,
      99_000_000,
      "429",
    );
    expect(query.mock.calls[0]?.[1]?.[3]).toBe(3_600_000);
  });

  it("reads cooldown by credential route and model", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ cooling: true }] });
    const pool = { query } as unknown as Pool;
    await expect(
      isProviderRouteCoolingDown(pool, limit.routeKey, limit.model),
    ).resolves.toBe(true);
    expect(query.mock.calls[0]?.[1]).toEqual([limit.routeKey, limit.model]);
  });

  it("returns null when any shared budget is exhausted", async () => {
    const db = mockPool([]);
    await expect(reserveProviderCapacity(db.pool, limit)).resolves.toBeNull();
    const sql = db.query.mock.calls.map((c) => String(c[0])).join("\n");
    expect(sql).not.toContain("VALUES ($1::uuid, $2, $3");
    expect(db.query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
  });

  it("releases concurrency and reconciles reserved tokens to actual usage", async () => {
    const db = mockPool();
    await releaseProviderCapacity(
      db.pool,
      {
        leaseId: "40c39c8c-665d-4d99-8059-2c26b4f18653",
        routeKey: limit.routeKey,
        reservedTokens: 12_000,
      },
      9_000,
    );
    const update = db.query.mock.calls.find((c) =>
      String(c[0]).includes("model_tokens = GREATEST"),
    );
    expect(update?.[1]).toEqual([limit.routeKey, 3_000]);
    expect(db.release).toHaveBeenCalledOnce();
  });

  it("validates limits before touching the database", async () => {
    const db = mockPool();
    await expect(
      reserveProviderCapacity(db.pool, { ...limit, tokensPerMinute: 0 }),
    ).rejects.toThrow("tokensPerMinute");
    expect(db.query).not.toHaveBeenCalled();
  });

  it("clamps an impossible TPM contract to one request instead of deadlocking", async () => {
    const db = mockPool();
    await reserveProviderCapacity(db.pool, {
      ...limit,
      tokensPerMinute: 1_000,
      reserveTokens: 12_000,
    });
    const insert = db.query.mock.calls.find((c) =>
      String(c[0]).includes("provider_capacity_buckets"),
    );
    expect(insert?.[1]?.[3]).toBe(12_000);
  });
});

describe("per-model capacity buckets on the shared key (2026-09-02)", () => {
  it("two NVIDIA models draw from two buckets; the OpenAI backup keeps its keyRef bucket", async () => {
    const { limitForRoute } = await import("./runtime");
    const { loadConfig } = await import("./config");
    const config = loadConfig({
      DATABASE_URL: "postgres://x",
      ENCRYPTION_KEY: "0".repeat(64),
      NVIDIA_API_KEYS: "k",
    } as NodeJS.ProcessEnv);
    const input = { system: "s", user: "u", maxTokens: 64 } as never;
    const nano = limitForRoute(
      { provider: "nvidia", model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", keyRef: "nvidia:shared:0" },
      input,
      config,
    );
    const superRoute = limitForRoute(
      { provider: "nvidia", model: "nvidia/nemotron-3-super-120b-a12b", keyRef: "nvidia:shared:0" },
      input,
      config,
    );
    expect(nano.routeKey).toBe("nvidia:shared:0:nvidia/nemotron-3-nano-omni-30b-a3b-reasoning");
    expect(superRoute.routeKey).toBe("nvidia:shared:0:nvidia/nemotron-3-super-120b-a12b");
    expect(nano.routeKey).not.toBe(superRoute.routeKey);
    expect(nano.requestsPerMinute).toBe(superRoute.requestsPerMinute);
    const openai = limitForRoute(
      { provider: "openai", model: "gpt-x", keyRef: "openai:shared:backup" },
      input,
      config,
    );
    expect(openai.routeKey).toBe("openai:shared:backup");
  });
});
