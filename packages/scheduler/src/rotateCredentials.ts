import type { Pool } from "pg";
import { decrypt, encrypt } from "./crypto.js";
import { maintenanceTransaction } from "./maintenance.js";

// Offline operator action only. All credential writers and schedulers must be
// stopped before this operation and stay stopped until the new key is installed.
// A rerun after an ambiguous COMMIT accepts rows already using the new key.
export async function rotateCredentials(
  pool: Pool,
  oldKey: Buffer,
  newKey: Buffer,
  apply = false,
): Promise<{
  agents: number;
  values: number;
  alreadyRotated: number;
  applied: boolean;
}> {
  if (oldKey.length !== 32 || newKey.length !== 32 || oldKey.equals(newKey)) {
    throw new Error("Rotation requires two distinct 32-byte master keys");
  }
  return maintenanceTransaction(pool, async (client) => {
    await client.query("LOCK TABLE agent_runtime.agents IN EXCLUSIVE MODE");
    const { rows } = await client.query<{
      id: number;
      coinrithm_key_enc: string;
      brain_key_enc: string | null;
    }>(
      "SELECT id, coinrithm_key_enc, brain_key_enc FROM agent_runtime.agents ORDER BY id FOR UPDATE",
    );
    let values = 0;
    let alreadyRotated = 0;
    const convert = (blob: string): string => {
      values++;
      try {
        decrypt(blob, newKey);
        alreadyRotated++;
        return blob;
      } catch {
        try {
          return encrypt(decrypt(blob, oldKey), newKey);
        } catch {
          // Never expose ciphertext, plaintext or raw cryptographic errors.
          throw new Error("Credential preflight failed; no rotation committed");
        }
      }
    };
    // Validate EVERY credential before issuing an update.
    const prepared = rows.map((row) => ({
      id: row.id,
      coin: convert(row.coinrithm_key_enc),
      brain: row.brain_key_enc === null ? null : convert(row.brain_key_enc),
    }));
    if (apply) {
      for (const row of prepared) {
        await client.query(
          "UPDATE agent_runtime.agents SET coinrithm_key_enc = $1, brain_key_enc = $2 WHERE id = $3",
          [row.coin, row.brain, row.id],
        );
      }
    }
    return { agents: rows.length, values, alreadyRotated, applied: apply };
  });
}
