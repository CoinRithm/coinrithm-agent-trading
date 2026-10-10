import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { readFileSync } from "node:fs";
import { Pool, type PoolClient } from "pg";
import { HOUSE, seedHouseAgents } from "../scripts/seed-house-agents.mjs";

const stopped = {
  disabled: true,
  disabledReason: "operator stop",
  consecutiveModelFailures: 7,
  consecutiveRejectCycles: 8,
  consecutiveExecFailures: 9,
  rateLimitHits: 10,
  realizedPnlMusd: 123,
  nextSeq: 42,
};
const cleared = {
  disabled: false,
  consecutiveModelFailures: 0,
  consecutiveRejectCycles: 0,
  consecutiveExecFailures: 0,
  rateLimitHits: 0,
  realizedPnlMusd: 123,
  nextSeq: 42,
};
const rawKeys = Object.fromEntries(
  HOUSE.map((h: { display: string }) => [
    `COINRITHM_KEY_${h.display.toUpperCase()}`,
    "fixture-only-key",
  ]),
);
function dependencies(pool: unknown, env: Record<string, string> = {}) {
  return {
    pool,
    env,
    log: vi.fn(),
    loadAgent: vi.fn(() => ({
      spec: { model: { provider: "nvidia" }, capabilities: [] },
      body: "reviewed fixture persona",
    })),
    newState: vi.fn(() => ({ nextSeq: 1 })),
    makeRunId: vi.fn(() => "fixture-run"),
    encrypt: vi.fn(() => "fixture-ciphertext"),
    masterKey: vi.fn(() => "fixture-master"),
  };
}

it("retains only the original five exact identities", () => {
  expect(
    HOUSE.map(({ handle, owner }: { handle: string; owner: number }) => [
      handle,
      owner,
    ]),
  ).toEqual([
    ["mia-trend-rider", 57],
    ["contrarian-carl", 58],
    ["leo-breakout-hunter", 59],
    ["olivia-calibrated-quant", 60],
    ["sam-risk-managed-swinger", 61],
  ]);
});

const databaseUrl = process.env.CAPACITY_TEST_DATABASE_URL;
if (process.env.CI && !databaseUrl)
  throw new Error("CI requires disposable PostgreSQL for seed roster proof");
describe.skipIf(!databaseUrl)(
  "house seed identity isolation on PostgreSQL",
  () => {
    let pool: Pool;
    let db: PoolClient;
    beforeAll(async () => {
      const target = new URL(databaseUrl!);
      if (
        target.hostname !== "127.0.0.1" ||
        target.pathname !== "/capacity_admission_test"
      )
        throw new Error("requires disposable loopback test database");
      pool = new Pool({ connectionString: databaseUrl });
      const present = await pool.query(
        "SELECT to_regclass('agent_runtime.agents') AS present",
      );
      if (!present.rows[0].present)
        await pool.query(
          readFileSync(
            new URL("../sql/001_agent_runtime.sql", import.meta.url),
            "utf8",
          ),
        );
    });
    afterAll(async () => {
      await pool?.end();
    });
    beforeEach(async () => {
      db = await pool.connect();
      await db.query("BEGIN");
    });
    afterEach(async () => {
      await db.query("ROLLBACK");
      db.release();
    });

    async function insert(
      handle: string,
      owner: number,
      extra: {
        house?: boolean;
        provider?: string;
        spec?: unknown;
        status?: string;
      } = {},
    ) {
      const row = await db.query(
        `INSERT INTO agent_runtime.agents
      (handle,owner_user_id,display_name,status,disabled_reason,is_house,live,cadence_seconds,model_provider,model_name,spec,prose,coinrithm_key_enc,next_run_at)
      VALUES ($1,$2,'original',$3,'operator stop',$4,true,180,$5,'original-model',$6::jsonb,'original-prose','original-ciphertext','2027-01-01T00:00:00Z') RETURNING id`,
        [
          handle,
          owner,
          extra.status ?? "disabled",
          extra.house ?? true,
          extra.provider ?? "nvidia",
          JSON.stringify(extra.spec ?? { model: { provider: "nvidia" } }),
        ],
      );
      const id = row.rows[0].id;
      await db.query(
        "INSERT INTO agent_runtime.agent_state(agent_id,state) VALUES($1,$2::jsonb)",
        [id, JSON.stringify(stopped)],
      );
      return id;
    }
    async function snapshot(id: string) {
      const result = await db.query(
        "SELECT to_jsonb(a) AS agent, s.state FROM agent_runtime.agents a LEFT JOIN agent_runtime.agent_state s ON s.agent_id=a.id WHERE a.id=$1",
        [id],
      );
      return result.rows[0];
    }
    it("refreshes/revives only five pairs while preserving pilot, other house, customer and benchmark state", async () => {
      const original = [];
      for (const h of HOUSE) original.push(await insert(h.handle, h.owner));
      const excluded = [
        await insert("new-pm-pilot", 900),
        await insert("other-house", 57),
        await insert("customer-agent", 901, { house: false }),
        await insert("mechanical-benchmark", 902, { provider: "mechanical" }),
      ];
      const before = await Promise.all(excluded.map(snapshot));
      const deps = dependencies(db);
      await seedHouseAgents(deps);
      expect(deps.masterKey).not.toHaveBeenCalled();
      expect(deps.encrypt).not.toHaveBeenCalled();
      expect(await Promise.all(excluded.map(snapshot))).toEqual(before);
      for (const id of original) {
        const row = await snapshot(id);
        expect(row.agent.status).toBe("active");
        expect(row.agent.disabled_reason).toBeNull();
        expect(row.agent.coinrithm_key_enc).toBe("original-ciphertext");
        expect(row.agent.prose).toBe("reviewed fixture persona");
        expect(row.state).toEqual(cleared);
      }
    });
    const exclusions = [
      { label: "remapped owner", owner: 999, extra: {} },
      {
        label: "customer with original pair",
        owner: 57,
        extra: { house: false },
      },
      {
        label: "mechanical column",
        owner: 57,
        extra: { provider: "mechanical" },
      },
      {
        label: "mechanical spec",
        owner: 57,
        extra: { spec: { model: { provider: "mechanical" } } },
      },
      { label: "malformed spec", owner: 57, extra: { spec: [] } },
    ];
    it.each(exclusions)(
      "config-only cannot replace/revive/reset $label",
      async ({ owner, extra }) => {
        const id = await insert("mia-trend-rider", owner, extra);
        const before = await snapshot(id);
        await seedHouseAgents(dependencies(db));
        expect(await snapshot(id)).toEqual(before);
      },
    );
    it.each(exclusions)(
      "keyed upsert refuses $label without state/key/definition takeover",
      async ({ owner, extra }) => {
        const id = await insert("mia-trend-rider", owner, extra);
        const before = await snapshot(id);
        await expect(
          seedHouseAgents(dependencies(db, rawKeys)),
        ).rejects.toThrow("excluded house identity: mia-trend-rider");
        expect(await snapshot(id)).toEqual(before);
      },
    );
    it("initial seed creates exactly five identities and rerun preserves sequence/PnL/schedule", async () => {
      await seedHouseAgents(dependencies(db, rawKeys));
      const rows = await db.query(
        "SELECT id,handle,owner_user_id,is_house,next_run_at FROM agent_runtime.agents WHERE handle = ANY($1) ORDER BY owner_user_id",
        [HOUSE.map((h: { handle: string }) => h.handle)],
      );
      expect(rows.rows).toHaveLength(5);
      expect(
        rows.rows.map((r) => [r.handle, Number(r.owner_user_id), r.is_house]),
      ).toEqual(
        HOUSE.map((h: { handle: string; owner: number }) => [
          h.handle,
          h.owner,
          true,
        ]),
      );
      await db.query(
        "UPDATE agent_runtime.agent_state SET state=$1::jsonb WHERE agent_id=ANY($2::bigint[])",
        [JSON.stringify(stopped), rows.rows.map((r) => r.id)],
      );
      await seedHouseAgents(dependencies(db, rawKeys));
      const after = await db.query(
        "SELECT id,handle,owner_user_id,is_house,next_run_at FROM agent_runtime.agents WHERE handle = ANY($1) ORDER BY owner_user_id",
        [HOUSE.map((h: { handle: string }) => h.handle)],
      );
      expect(after.rows).toEqual(rows.rows);
      const states = await db.query(
        "SELECT state FROM agent_runtime.agent_state WHERE agent_id = ANY($1::bigint[])",
        [rows.rows.map((r) => r.id)],
      );
      expect(
        states.rows.every(
          (r) =>
            JSON.stringify(r.state) === JSON.stringify(states.rows[0].state),
        ),
      ).toBe(true);
      expect(states.rows[0].state).toEqual(cleared);
    });
    it("state initialization repeats identity guard after an intervening remap", async () => {
      const proxy = {
        query: async (sql: string, params: unknown[]) => {
          const result = await db.query(sql, params);
          if (
            sql.includes("INSERT INTO agent_runtime.agents AS a") &&
            result.rows[0]
          )
            await db.query(
              "UPDATE agent_runtime.agents SET owner_user_id=999 WHERE id=$1",
              [result.rows[0].id],
            );
          return result;
        },
      };
      await seedHouseAgents(dependencies(proxy, rawKeys));
      expect(
        (
          await db.query(
            "SELECT s.* FROM agent_runtime.agent_state s JOIN agent_runtime.agents a ON a.id=s.agent_id WHERE a.handle=ANY($1)",
            [HOUSE.map((h: { handle: string }) => h.handle)],
          )
        ).rows,
      ).toHaveLength(0);
    });
  },
);
