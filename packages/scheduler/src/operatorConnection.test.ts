import { describe, expect, it } from "vitest";
import {
  assertOperatorConnection,
  operatorDatabaseUrl,
} from "./operatorConnection.js";

const poolAs = (role: string) => ({
  query: async () => ({ rows: [{ role }] }),
});

describe("operator connection for scripts beyond the runtime grants", () => {
  it("requires OPERATOR_DATABASE_URL and never falls back to DATABASE_URL", () => {
    expect(() =>
      operatorDatabaseUrl({ DATABASE_URL: "postgresql://runtime" }),
    ).toThrow("OPERATOR_DATABASE_URL is required");
    expect(() => operatorDatabaseUrl({ OPERATOR_DATABASE_URL: "  " })).toThrow(
      "OPERATOR_DATABASE_URL is required",
    );
    expect(
      operatorDatabaseUrl({ OPERATOR_DATABASE_URL: " postgresql://operator " }),
    ).toBe("postgresql://operator");
  });

  it("refuses the runtime role before the script's first statement", async () => {
    await expect(
      assertOperatorConnection(
        poolAs("coinrithm_scheduler") as any,
        "house-rollout",
      ),
    ).rejects.toThrow("house-rollout must not run as coinrithm_scheduler");
    await expect(
      assertOperatorConnection(poolAs("postgres") as any, "house-rollout"),
    ).resolves.toBeUndefined();
  });
});
