import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { recordCycle } from "./db.js";

describe("hosted observation receipt", () => {
  it("persists the hash and indicator version on the cycle row", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query } as unknown as Pool;
    const observationHash = `sha256:${"b".repeat(64)}`;

    await recordCycle(pool, 42, {
      decision: "skip",
      observationHash,
      indicatorVersion: "coinrithm.indicators.v1",
    });

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("observation_hash");
    expect(sql).toContain("indicator_version");
    expect(params.at(-2)).toBe(observationHash);
    expect(params.at(-1)).toBe("coinrithm.indicators.v1");
  });
});
