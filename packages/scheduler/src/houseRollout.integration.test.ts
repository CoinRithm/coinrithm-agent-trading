import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { Pool, type PoolClient } from "pg";
import { migrate } from "./db.js";
import {
  contentHash,
  runHouseRollout,
  type LoadedBundle,
  type RolloutPlan,
} from "./houseRollout.js";

// Real SQL regression test for the rollout against the disposable LOCAL
// database only (same contract as capacity.integration.test.ts). Everything
// runs on one client inside a transaction (savepoints stand in for the
// script's own BEGIN/COMMIT), so nothing leaks to the shared tables.
const databaseUrl = process.env.CAPACITY_TEST_DATABASE_URL;
if (process.env.CI && !databaseUrl) {
  throw new Error(
    "CI requires CAPACITY_TEST_DATABASE_URL; PostgreSQL integration cannot be skipped",
  );
}

// agent_revisions is owned by backend-v2 (src/database/215_agent_revisions.sql)
// and is not part of the scheduler's boot migrations; the columns and the
// one-open-window index below mirror that file for the test database.
const REVISIONS_DDL = `
CREATE TABLE IF NOT EXISTS agent_runtime.agent_revisions (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agent_id               BIGINT NOT NULL REFERENCES agent_runtime.agents(id) ON DELETE CASCADE,
  revision               INTEGER NOT NULL,
  prose                  TEXT NOT NULL,
  spec                   JSONB NOT NULL,
  cadence_seconds        INTEGER NOT NULL,
  model_provider         TEXT NOT NULL,
  model_name             TEXT NOT NULL,
  content_hash           TEXT NOT NULL,
  change_note            TEXT,
  author                 TEXT NOT NULL,
  created_by_user_id     BIGINT,
  reverted_from_revision INTEGER,
  is_baseline            BOOLEAN NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at               TIMESTAMPTZ,
  cycle_stats            JSONB,
  cycle_stats_at         TIMESTAMPTZ,
  CONSTRAINT agent_revisions_agent_revision_key UNIQUE (agent_id, revision),
  CONSTRAINT agent_revisions_revision_positive CHECK (revision >= 1),
  CONSTRAINT agent_revisions_window_ordered CHECK (ended_at IS NULL OR ended_at >= created_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS agent_revisions_one_open_idx
  ON agent_runtime.agent_revisions (agent_id) WHERE ended_at IS NULL;`;

describe.skipIf(!databaseUrl)("house rollout on PostgreSQL", () => {
  let pool: Pool;
  let client: PoolClient;

  const savepointPool = (): Pool =>
    ({
      connect: async () => ({
        query: (text: string, params?: unknown[]) =>
          client.query(
            text === "BEGIN"
              ? "SAVEPOINT rollout_case"
              : text === "COMMIT"
                ? "RELEASE SAVEPOINT rollout_case"
                : text === "ROLLBACK"
                  ? "ROLLBACK TO SAVEPOINT rollout_case"
                  : text,
            params,
          ),
        release: () => {},
      }),
      query: (text: string, params?: unknown[]) => client.query(text, params),
    }) as unknown as Pool;
  const transaction = async <T>(
    _pool: Pool,
    op: (c: PoolClient) => Promise<T>,
  ): Promise<T> => {
    await client.query("SAVEPOINT rollout_apply");
    try {
      const out = await op(client);
      await client.query("RELEASE SAVEPOINT rollout_apply");
      return out;
    } catch (e) {
      await client.query("ROLLBACK TO SAVEPOINT rollout_apply");
      throw e;
    }
  };

  beforeAll(async () => {
    const target = new URL(databaseUrl!);
    if (
      target.hostname !== "127.0.0.1" ||
      target.pathname !== "/capacity_admission_test"
    ) {
      throw new Error(
        "House rollout integration requires the disposable loopback test database",
      );
    }
    pool = new Pool({ connectionString: databaseUrl });
    await migrate(pool);
    await pool.query(REVISIONS_DDL);
  });
  afterAll(async () => {
    await pool?.end();
  });
  beforeEach(async () => {
    client = await pool.connect();
    await client.query("BEGIN");
  });
  afterEach(async () => {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
  });

  const liveSpec = {
    killSwitch: { maxDrawdownMusd: 6000 },
    capabilities: ["indicators"],
  };
  async function insertHouse(status: string, disabledReason: string | null) {
    const { rows } = await client.query<{ id: string; created_at: Date }>(
      `INSERT INTO agent_runtime.agents
         (owner_user_id, handle, display_name, status, disabled_reason, is_house, cadence_seconds,
          model_provider, model_name, spec, prose, coinrithm_key_enc, next_run_at)
       VALUES (57, 'mia-trend-rider', 'Mia', $1, $2, true, 180, 'nvidia', 'nano',
               $3::jsonb, 'Old persona prose.', 'enc', now() + interval '60 seconds')
       RETURNING id, created_at`,
      [status, disabledReason, JSON.stringify(liveSpec)],
    );
    const id = Number(rows[0]!.id);
    await client.query(
      `INSERT INTO agent_runtime.agent_state (agent_id, state)
       VALUES ($1, '{"disabled":true,"disabledReason":"drawdown 6064.25 >= 6000","peakRealizedMusd":812.5,"realizedPnlMusd":-5251.75,"consecutiveRejectCycles":2}'::jsonb)`,
      [id],
    );
    return { id, createdAt: rows[0]!.created_at };
  }
  const liveHash = () =>
    contentHash({
      prose: "Old persona prose.",
      spec: liveSpec,
      cadenceSeconds: 180,
      modelProvider: "nvidia",
      modelName: "nano",
    });
  const bundle: LoadedBundle = {
    spec: { killSwitch: { maxDrawdownMusd: 0 }, capabilities: ["indicators"] },
    prose: "New persona prose.",
  };
  const plan = (resume: boolean): RolloutPlan => ({
    version: "personas-v2",
    entries: [
      {
        handle: "mia-trend-rider",
        bundlePath: "fixture",
        expectedContentHash: liveHash(),
        resume,
      },
    ],
  });

  it("applies with a backfilled baseline, a new owner revision, the spec/prose update and a flag-only resume", async () => {
    const { id, createdAt } = await insertHouse(
      "disabled",
      "drawdown 6064.25 >= 6000",
    );
    const result = await runHouseRollout(
      savepointPool(),
      plan(true),
      { apply: true },
      {
        loadBundle: () => bundle,
        transaction,
      },
    );
    expect(result.applied).toBe(true);
    expect(result.entries[0]).toMatchObject({ decision: "apply", agentId: id });

    const { rows: revisions } = await client.query<{
      revision: number;
      author: string;
      is_baseline: boolean;
      content_hash: string;
      created_at: Date;
      ended_at: Date | null;
      created_by_user_id: string | null;
    }>(
      `SELECT revision, author, is_baseline, content_hash, created_at, ended_at, created_by_user_id
         FROM agent_runtime.agent_revisions WHERE agent_id = $1 ORDER BY revision`,
      [id],
    );
    expect(revisions.map((r) => [r.revision, r.author, r.is_baseline])).toEqual(
      [
        [1, "system_backfill", true],
        [2, "owner", false],
      ],
    );
    expect(revisions[0]!.content_hash).toBe(liveHash());
    expect(revisions[0]!.created_at.getTime()).toBe(createdAt.getTime());
    expect(revisions[0]!.ended_at).not.toBeNull();
    expect(revisions[1]!.ended_at).toBeNull();
    expect(Number(revisions[1]!.created_by_user_id)).toBe(57);
    // Gapless window: the baseline closes exactly where the new one opens.
    expect(revisions[0]!.ended_at!.getTime()).toBe(
      revisions[1]!.created_at.getTime(),
    );

    const { rows: agents } = await client.query<{
      status: string;
      disabled_reason: string | null;
      prose: string;
      spec: Record<string, unknown>;
      model_name: string;
      cadence_seconds: number;
      due_now: boolean;
    }>(
      `SELECT status, disabled_reason, prose, spec, model_name, cadence_seconds,
              (next_run_at <= now()) AS due_now
         FROM agent_runtime.agents WHERE id = $1`,
      [id],
    );
    expect(agents[0]).toMatchObject({
      status: "active",
      disabled_reason: null,
      prose: "New persona prose.",
      model_name: "nano",
      cadence_seconds: 180,
      due_now: true,
    });
    expect(agents[0]!.spec).toEqual(bundle.spec);

    const { rows: state } = await client.query<{
      state: Record<string, unknown>;
    }>("SELECT state FROM agent_runtime.agent_state WHERE agent_id = $1", [id]);
    expect(state[0]!.state).toEqual({
      disabled: false,
      peakRealizedMusd: 812.5,
      realizedPnlMusd: -5251.75,
      consecutiveRejectCycles: 2,
    });
  });

  it("dry run writes nothing and a drifted baseline is rejected with nothing written", async () => {
    const { id } = await insertHouse("active", null);
    const dry = await runHouseRollout(
      savepointPool(),
      plan(false),
      { apply: false },
      {
        loadBundle: () => bundle,
      },
    );
    expect(dry.applied).toBe(false);
    expect(dry.entries[0]!.decision).toBe("apply");
    const countRevisions = async () =>
      Number(
        (
          await client.query<{ n: string }>(
            "SELECT count(*) AS n FROM agent_runtime.agent_revisions WHERE agent_id = $1",
            [id],
          )
        ).rows[0]!.n,
      );
    expect(await countRevisions()).toBe(0);

    await client.query(
      "UPDATE agent_runtime.agents SET prose = 'edited since review' WHERE id = $1",
      [id],
    );
    await expect(
      runHouseRollout(
        savepointPool(),
        plan(false),
        { apply: true },
        {
          loadBundle: () => bundle,
          transaction,
        },
      ),
    ).rejects.toThrow(/differs from the reviewed baseline/);
    expect(await countRevisions()).toBe(0);
    const { rows } = await client.query<{ prose: string }>(
      "SELECT prose FROM agent_runtime.agents WHERE id = $1",
      [id],
    );
    expect(rows[0]!.prose).toBe("edited since review");
  });
});
