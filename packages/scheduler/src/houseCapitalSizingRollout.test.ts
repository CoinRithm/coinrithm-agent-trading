import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  HOUSE_CAPITAL_ROSTER,
  rolloutHouseCapitalSizing,
} from "../scripts/rollout-house-capital-sizing.mjs";

const policy = {
  version: "equity_fraction_v1",
  futuresRiskPct: 0.75,
  pmMaxLossPct: 2,
  perTicketCapitalPct: 6,
  totalCapitalPct: 40,
  cashReservePct: 20,
  minRewardRisk: 1.5,
};
const policies = Object.fromEntries(
  HOUSE_CAPITAL_ROSTER.map(({ handle }: { handle: string }) => [
    handle,
    policy,
  ]),
);

function fakeDb(over: Record<string, unknown> = {}) {
  return {
    query: vi.fn(async (sql: string, params: unknown[]) => {
      if (sql.startsWith("SELECT"))
        return {
          rows: [
            { id: Number(params[1]), hasPolicy: false, policy: null, ...over },
          ],
        };
      return { rowCount: 1, rows: [] };
    }),
  };
}

describe("original-house capital sizing rollout (offline fake DB only)", () => {
  it("dry-runs by default and selects only the exact original-house non-mechanical identities", async () => {
    const db = fakeDb();
    const result = await rolloutHouseCapitalSizing(db, policies);
    expect(result).toHaveLength(5);
    expect(
      result.every((row: { action: string }) => row.action === "would_opt_in"),
    ).toBe(true);
    expect(db.query).toHaveBeenCalledTimes(5);
    expect(db.query.mock.calls.map(([, params]) => params)).toEqual([
      ["mia-trend-rider", 57],
      ["contrarian-carl", 58],
      ["leo-breakout-hunter", 59],
      ["olivia-calibrated-quant", 60],
      ["sam-risk-managed-swinger", 61],
    ]);
    for (const [sql] of db.query.mock.calls) {
      expect(sql).toMatch(/^SELECT/);
      expect(sql).toContain("owner_user_id = $2");
      expect(sql).toContain("is_house = true");
      expect(sql).toContain("model_provider <> 'mechanical'");
      expect(sql).toContain(
        "(spec #>> '{model,provider}') IS DISTINCT FROM 'mechanical'",
      );
    }
  });

  it("commit patches only missing spec.capitalSizing and repeats all scope guards atomically", async () => {
    const db = fakeDb();
    const result = await rolloutHouseCapitalSizing(db, policies, true);
    expect(
      result.every((row: { action: string }) => row.action === "opted_in"),
    ).toBe(true);
    const writes = db.query.mock.calls.filter(([sql]) =>
      sql.startsWith("UPDATE"),
    );
    expect(writes).toHaveLength(5);
    for (const [sql, params] of writes) {
      expect(sql).toContain(
        "SET spec = jsonb_set(spec, '{capitalSizing}', $3::jsonb, true)",
      );
      expect(sql).toContain("AND id = $4");
      expect(sql).toContain("AND NOT (spec ? 'capitalSizing')");
      expect(sql).toContain("is_house = true");
      expect(sql).not.toMatch(
        /updated_at|prose|cadence|coinrithm_key|agent_state|status\s*=|model_provider\s*=/,
      );
      expect(JSON.parse(String(params[2]))).toEqual(policy);
    }
  });

  it("leaves identical and differing pre-existing policies untouched", async () => {
    for (const existing of [policy, { ...policy, pmMaxLossPct: 1 }, null]) {
      const db = fakeDb({ hasPolicy: true, policy: existing });
      const result = await rolloutHouseCapitalSizing(db, policies, true);
      expect(db.query).toHaveBeenCalledTimes(5);
      expect(
        result.every(
          (row: { action: string }) =>
            row.action ===
            (existing === policy
              ? "already_configured"
              : "preserved_existing_policy"),
        ),
      ).toBe(true);
    }
  });

  it("does no updates if any original identity is missing/excluded", async () => {
    const db = fakeDb();
    db.query.mockResolvedValueOnce({ rows: [] });
    await expect(rolloutHouseCapitalSizing(db, policies, true)).rejects.toThrow(
      "roster incomplete",
    );
    expect(db.query.mock.calls.every(([sql]) => sql.startsWith("SELECT"))).toBe(
      true,
    );
  });

  it("throws on a concurrent identity or policy change so the CLI rolls back", async () => {
    const db = fakeDb();
    db.query.mockImplementation(async (sql) =>
      sql.startsWith("SELECT")
        ? { rows: [{ id: 57, hasPolicy: false, policy: null }] }
        : { rowCount: 0, rows: [] },
    );
    await expect(rolloutHouseCapitalSizing(db, policies, true)).rejects.toThrow(
      "changed during rollout",
    );
    const script = readFileSync(
      new URL("../scripts/rollout-house-capital-sizing.mjs", import.meta.url),
      "utf8",
    );
    expect(script).toContain('commit ? "BEGIN" : "BEGIN READ ONLY"');
    expect(script).toContain('client.query("ROLLBACK")');
    expect(script).not.toContain("loadMasterKey");
    expect(script).not.toContain("ENCRYPTION_KEY");
  });
});
