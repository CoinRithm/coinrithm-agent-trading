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
import {
  claimDueAgents,
  configureScheduling,
  migrate,
  phaseOffsetSeconds,
  rescheduleToCadence,
} from "./db.js";

// Real SQL regression tests for the phase grid, against the disposable LOCAL
// database only (same contract as capacity.integration.test.ts).
const databaseUrl = process.env.CAPACITY_TEST_DATABASE_URL;
if (process.env.CI && !databaseUrl) {
  throw new Error(
    "CI requires CAPACITY_TEST_DATABASE_URL; PostgreSQL integration cannot be skipped",
  );
}

describe.skipIf(!databaseUrl)("phase grid on PostgreSQL", () => {
  let pool: Pool;
  // One client + one transaction per test: the capacity integration file runs
  // in a parallel worker against the same database and clears the agents
  // table in its own beforeEach; uncommitted rows are invisible to it and the
  // rollback leaves nothing behind.
  let client: PoolClient;
  const asPool = (): Pool => client as unknown as Pool;
  const CADENCE = 180;

  beforeAll(async () => {
    const target = new URL(databaseUrl!);
    if (
      target.hostname !== "127.0.0.1" ||
      target.pathname !== "/capacity_admission_test"
    ) {
      throw new Error(
        "Phase grid integration requires the disposable loopback test database",
      );
    }
    pool = new Pool({ connectionString: databaseUrl });
    await migrate(pool);
  });
  afterAll(async () => {
    await pool?.end();
  });
  beforeEach(async () => {
    client = await pool.connect();
    await client.query("BEGIN");
    inserted.length = 0;
    configureScheduling({ phaseGrid: true });
  });
  afterEach(async () => {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
  });

  const inserted: number[] = [];
  async function insertAgent(handle: string): Promise<number> {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO agent_runtime.agents
         (handle, display_name, cadence_seconds, model_provider, model_name,
          spec, prose, coinrithm_key_enc)
       VALUES ($1, $1, $2, 'nvidia', 'fixture-model', '{}'::jsonb, 'fixture', 'enc')
       RETURNING id`,
      [handle, CADENCE],
    );
    const id = Number(rows[0]!.id);
    inserted.push(id);
    return id;
  }

  async function dueOffsets(): Promise<
    Array<{ id: number; ahead: number; onGrid: boolean }>
  > {
    const { rows } = await client.query<{ id: string; e: string; n: string }>(
      `SELECT id, extract(epoch FROM next_run_at)::bigint AS e,
              extract(epoch FROM now())::bigint AS n
         FROM agent_runtime.agents
        WHERE id = ANY($1::bigint[]) ORDER BY id`,
      [inserted],
    );
    return rows.map((r) => {
      const id = Number(r.id);
      const e = Number(r.e);
      return {
        id,
        ahead: e - Number(r.n),
        onGrid: (e - phaseOffsetSeconds(id, CADENCE)) % CADENCE === 0,
      };
    });
  }

  it("reschedules each agent onto its own grid: strictly ahead, within one cadence, on its phase", async () => {
    // Two shared agents keep the pool floor (ceil(2*60/8) = 15 s) below the
    // configured cadence, so the slot is exactly CADENCE.
    const first = await insertAgent("grid-first");
    const second = await insertAgent("grid-second");
    await rescheduleToCadence(asPool(), first);
    await rescheduleToCadence(asPool(), second);
    const offsets = await dueOffsets();
    expect(offsets.map((o) => o.id)).toEqual([first, second]);
    for (const o of offsets) {
      expect(o.ahead).toBeGreaterThan(0);
      expect(o.ahead).toBeLessThanOrEqual(CADENCE);
      expect(o.onGrid).toBe(true);
    }
    // The SQL phase agrees with the JS mirror, so the two agents differ.
    expect(phaseOffsetSeconds(first, CADENCE)).not.toBe(
      phaseOffsetSeconds(second, CADENCE),
    );
  });

  it("claimDueAgents skips locally in-flight agents on real SQL", async () => {
    // claimDueAgents runs its own BEGIN/COMMIT on a pooled connection; this
    // wrapper maps them onto a savepoint of the test transaction so the
    // claim sees the uncommitted fixture row and nothing leaks to the shared
    // table (the capacity file wipes it from a parallel worker).
    const savepointPool = {
      connect: async () => ({
        query: (text: string, params?: unknown[]) =>
          client.query(
            text === "BEGIN"
              ? "SAVEPOINT claim_case"
              : text === "COMMIT"
                ? "RELEASE SAVEPOINT claim_case"
                : text === "ROLLBACK"
                  ? "ROLLBACK TO SAVEPOINT claim_case"
                  : text,
            params,
          ),
        release: () => {},
      }),
    } as unknown as Pool;
    const id = await insertAgent("claim-exclude");
    await client.query(
      "UPDATE agent_runtime.agents SET next_run_at = now() - interval '1 second' WHERE id = $1",
      [id],
    );
    const excluded = await claimDueAgents(savepointPool, 10, true, [id]);
    expect(excluded.some((a) => a.id === id)).toBe(false);
    const claimed = await claimDueAgents(savepointPool, 10, true);
    expect(claimed.some((a) => a.id === id)).toBe(true);
  });

  it("with the grid off, a reschedule is exactly now()+cadence", async () => {
    configureScheduling({ phaseGrid: false });
    const id = await insertAgent("grid-off");
    await rescheduleToCadence(asPool(), id);
    const [o] = await dueOffsets();
    expect(o!.ahead).toBeGreaterThanOrEqual(CADENCE - 1);
    expect(o!.ahead).toBeLessThanOrEqual(CADENCE);
  });
});
