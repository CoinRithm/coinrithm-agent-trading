import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  RUNTIME_COLUMN_READS,
  RUNTIME_DML_TABLES,
  RUNTIME_READ_TABLES,
  runtimePrivilegeChecks,
} from "./runtimeGrants.js";

const roleSql = readFileSync(
  new URL("../sql/maintenance/runtime-role.sql", import.meta.url),
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

  it("checks every privilege on its own (a comma list in has_table_privilege means ANY)", () => {
    const checks = runtimePrivilegeChecks();
    expect(checks.every((check) => !check.privilege.includes(","))).toBe(true);
    expect(checks).toHaveLength(RUNTIME_DML_TABLES.length * 4 + 1 + 3);
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
  });
});
