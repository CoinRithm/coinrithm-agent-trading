import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  RUNTIME_COLUMN_READS,
  RUNTIME_LIMITED_GRANTS,
  RUNTIME_DML_TABLES,
  RUNTIME_READ_TABLES,
  RUNTIME_SEQUENCE_USAGE,
  runtimePrivilegeChecks,
} from "./runtimeGrants.js";

const roleSql = readFileSync(
  new URL("../sql/maintenance/runtime-role.sql", import.meta.url),
  "utf8",
);
const ledgerMigration = readFileSync(
  new URL("../sql/008_paid_brain_credits.sql", import.meta.url),
  "utf8",
);

describe("runtime grants: one list for provisioning and readiness", () => {
  it("runtime-role.sql grants DML on exactly the tables readiness checks", () => {
    const block = roleSql.match(
      /GRANT SELECT, INSERT, UPDATE, DELETE ON\s+([\s\S]*?)\s+TO coinrithm_scheduler;/,
    );
    expect(block).not.toBeNull();
    const granted = block![1]
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    expect(granted).toEqual([...RUNTIME_DML_TABLES]);
  });

  it("runtime-role.sql grants the read-only tables and ApiKey columns readiness checks", () => {
    for (const table of RUNTIME_READ_TABLES) {
      expect(roleSql).toContain(
        `GRANT SELECT ON ${table} TO coinrithm_scheduler;`,
      );
    }
    for (const { table, columns } of RUNTIME_COLUMN_READS) {
      const quoted = columns
        .map((column) => (/[A-Z]/.test(column) ? `"${column}"` : column))
        .join(", ");
      expect(roleSql).toContain(
        `GRANT SELECT (${quoted}) ON ${table} TO coinrithm_scheduler;`,
      );
    }
  });

  it("grants the paid-brain tables exactly their limited privileges, in the role file and the migration", () => {
    const forbidden = ["UPDATE", "DELETE", "TRUNCATE"];
    for (const { table, privileges } of RUNTIME_LIMITED_GRANTS) {
      const grant = `GRANT ${privileges.join(", ")} ON ${table} TO coinrithm_scheduler;`;
      const revoked = forbidden.filter((p) => !privileges.includes(p));
      expect(roleSql).toContain(grant);
      expect(roleSql).toContain(
        `REVOKE ${revoked.join(", ")} ON ${table} FROM PUBLIC, coinrithm_scheduler;`,
      );
      expect(ledgerMigration).toContain(grant);
      expect(ledgerMigration).toContain(
        `REVOKE ${revoked.join(", ")} ON ${table} FROM coinrithm_scheduler;`,
      );
      // Not on the DML list: nothing may grant the runtime DELETE.
      expect(RUNTIME_DML_TABLES as readonly string[]).not.toContain(table);
      expect(privileges).not.toContain("DELETE");
    }
    // The money ledger itself is append-only.
    expect(
      RUNTIME_LIMITED_GRANTS.find(
        (grant) => grant.table === "agent_runtime.credit_ledger",
      )?.privileges,
    ).toEqual(["SELECT", "INSERT"]);
    for (const sequence of RUNTIME_SEQUENCE_USAGE) {
      expect(roleSql).toContain(
        `GRANT USAGE ON SEQUENCE ${sequence} TO coinrithm_scheduler;`,
      );
      expect(ledgerMigration).toContain(
        `GRANT USAGE ON SEQUENCE ${sequence} TO coinrithm_scheduler;`,
      );
    }
    // The scheduler never touches checkouts.
    expect(roleSql).not.toContain("credit_checkouts");
    expect(roleSql).not.toContain("credit_adjustments");
    expect(ledgerMigration).toContain(
      "REVOKE ALL ON agent_runtime.credit_checkouts FROM coinrithm_scheduler;",
    );
    expect(ledgerMigration).toContain(
      "REVOKE ALL ON agent_runtime.credit_adjustments FROM coinrithm_scheduler;",
    );
  });

  it("grants the API role ledger inserts, paid_calls reads and checkout writes, only if it exists", () => {
    expect(ledgerMigration).toContain(
      "IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'coinrithm_app')",
    );
    for (const line of [
      "GRANT SELECT, INSERT ON agent_runtime.credit_ledger TO coinrithm_app;",
      "REVOKE UPDATE, DELETE, TRUNCATE ON agent_runtime.credit_ledger FROM coinrithm_app;",
      "GRANT SELECT ON agent_runtime.paid_calls TO coinrithm_app;",
      "REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON agent_runtime.paid_calls FROM coinrithm_app;",
      "GRANT SELECT, INSERT, UPDATE ON agent_runtime.credit_checkouts TO coinrithm_app;",
      "REVOKE DELETE, TRUNCATE ON agent_runtime.credit_checkouts FROM coinrithm_app;",
      "GRANT SELECT, INSERT, UPDATE ON agent_runtime.credit_adjustments TO coinrithm_app;",
      "REVOKE DELETE, TRUNCATE ON agent_runtime.credit_adjustments FROM coinrithm_app;",
    ]) {
      expect(ledgerMigration).toContain(line);
    }
    expect(ledgerMigration).not.toMatch(
      /GRANT[^;]*(UPDATE|DELETE|TRUNCATE)[^;]*credit_ledger/,
    );
  });

  it("keeps the ledger sign rule of contract v2 in the CHECK", () => {
    expect(ledgerMigration).toContain(
      "kind IN ('grant','topup','refund','release','reserve','debit','reversal','restore')",
    );
    expect(ledgerMigration).toMatch(
      /WHEN kind IN \('reserve','debit','reversal'\)\s+THEN amount_micro_usd < 0\s+ELSE amount_micro_usd > 0 END/,
    );
  });

  it("checks every privilege on its own (a comma list in has_table_privilege means ANY)", () => {
    const checks = runtimePrivilegeChecks();
    expect(checks.every((check) => !check.privilege.includes(","))).toBe(true);
    expect(checks).toHaveLength(
      RUNTIME_DML_TABLES.length * 4 +
        RUNTIME_LIMITED_GRANTS.reduce(
          (sum, grant) => sum + grant.privileges.length,
          0,
        ) +
        RUNTIME_SEQUENCE_USAGE.length +
        1 +
        3,
    );
    expect(checks).toContainEqual({
      table: "agent_runtime.agent_cycles",
      column: null,
      privilege: "DELETE",
    });
    expect(checks).toContainEqual({
      table: 'public."ApiKey"',
      column: "revokedAt",
      privilege: "SELECT",
    });
    expect(checks).toContainEqual({
      table: "agent_runtime.credit_ledger",
      column: null,
      privilege: "INSERT",
    });
    expect(checks).toContainEqual({
      table: "agent_runtime.credit_ledger_id_seq",
      column: null,
      privilege: "USAGE",
    });
    expect(checks).not.toContainEqual({
      table: "agent_runtime.credit_ledger",
      column: null,
      privilege: "UPDATE",
    });
    expect(checks).toContainEqual({
      table: "agent_runtime.paid_calls",
      column: null,
      privilege: "UPDATE",
    });
    expect(checks).not.toContainEqual({
      table: "agent_runtime.paid_calls",
      column: null,
      privilege: "DELETE",
    });
    expect(checks).not.toContainEqual({
      table: "agent_runtime.credit_ledger",
      column: null,
      privilege: "DELETE",
    });
  });
});
