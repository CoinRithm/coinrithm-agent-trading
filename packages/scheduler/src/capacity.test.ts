import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import {
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
    expect(sql).toContain("clock_timestamp()");
    expect(sql).toContain("provider_capacity_leases");
    expect(db.query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
    expect(db.release).toHaveBeenCalledOnce();
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
});

