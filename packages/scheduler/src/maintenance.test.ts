import { describe, it, expect, vi } from "vitest";
import type { Pool } from "pg";
import { maintenanceTransaction, MAINTENANCE_LOCK } from "./maintenance.js";
import { rotateCredentials } from "./rotateCredentials.js";
import { encrypt, decrypt } from "./crypto.js";

function fixture(rows: unknown[] = []) {
  const query = vi.fn().mockResolvedValue({ rows });
  const release = vi.fn();
  const client = { query, release };
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
  } as unknown as Pool;
  return { pool, client, query, release };
}
const oldKey = Buffer.alloc(32, 1);
const newKey = Buffer.alloc(32, 2);

describe("maintenance transaction", () => {
  it("owns one connection and locks before the operation", async () => {
    const f = fixture();
    const result = await maintenanceTransaction(f.pool, async (client) => {
      expect(client).toBe(f.client);
      expect(f.query).toHaveBeenLastCalledWith(
        "SELECT pg_advisory_xact_lock($1, $2)",
        [...MAINTENANCE_LOCK],
      );
      return 7;
    });
    expect(result).toBe(7);
    expect(f.query).toHaveBeenLastCalledWith("COMMIT");
    expect(f.release).toHaveBeenCalledWith(false);
  });
  it.each([false, true])(
    "preserves the failure and discards a broken rollback: %s",
    async (broken) => {
      const f = fixture();
      f.query.mockImplementation(async (sql: string) => {
        if (broken && sql === "ROLLBACK") throw new Error("disconnect");
        return { rows: [] };
      });
      const error = new Error("migration failed");
      await expect(
        maintenanceTransaction(f.pool, async () => {
          throw error;
        }),
      ).rejects.toBe(error);
      expect(f.query).toHaveBeenLastCalledWith("ROLLBACK");
      expect(f.release).toHaveBeenCalledWith(broken);
    },
  );
});

describe("credential rotation", () => {
  const row = () => ({
    id: 1,
    coinrithm_key_enc: encrypt("fixture-coin", oldKey),
    brain_key_enc: null,
  });
  it("preflights without changing data by default", async () => {
    const f = fixture([row()]);
    expect(await rotateCredentials(f.pool, oldKey, newKey)).toEqual({
      agents: 1,
      values: 1,
      alreadyRotated: 0,
      applied: false,
    });
    expect(f.query.mock.calls.some(([sql]) => sql.startsWith("UPDATE"))).toBe(
      false,
    );
  });
  it("reencrypts both values and safely reruns after an ambiguous commit", async () => {
    const f = fixture([
      { ...row(), brain_key_enc: encrypt("fixture-brain", newKey) },
    ]);
    expect(await rotateCredentials(f.pool, oldKey, newKey, true)).toMatchObject(
      { values: 2, alreadyRotated: 1, applied: true },
    );
    const update = f.query.mock.calls.find(([sql]) =>
      sql.startsWith("UPDATE"),
    )!;
    expect(decrypt(update[1][0], newKey)).toBe("fixture-coin");
    expect(decrypt(update[1][1], newKey)).toBe("fixture-brain");
    expect(update[1][2]).toBe(1);
  });
  it("aborts all rows when any credential cannot be decrypted", async () => {
    const f = fixture([row(), { ...row(), id: 2, brain_key_enc: "malformed" }]);
    await expect(
      rotateCredentials(f.pool, oldKey, newKey, true),
    ).rejects.toThrow("preflight failed");
    expect(f.query.mock.calls.some(([sql]) => sql.startsWith("UPDATE"))).toBe(
      false,
    );
    expect(f.query).toHaveBeenLastCalledWith("ROLLBACK");
  });
  it.each([
    [oldKey, oldKey],
    [Buffer.alloc(2), newKey],
    [oldKey, Buffer.alloc(1)],
  ])("rejects invalid key pairs before connecting", async (old, next) => {
    const f = fixture();
    await expect(rotateCredentials(f.pool, old, next)).rejects.toThrow(
      "distinct 32-byte",
    );
    expect(f.pool.connect).not.toHaveBeenCalled();
  });
});
