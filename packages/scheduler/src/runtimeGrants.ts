// The scheduler runtime role's grants, in ONE place. The operator file
// sql/maintenance/runtime-role.sql provisions exactly these (pinned by
// runtimeGrants.test.ts), and assertSchemaReady checks every one of them at
// startup, so a missing grant fails readiness with its name instead of
// surfacing as a permission error on the first write of a live cycle (for
// example after a migration adds a table and nobody re-runs the role file).

export const RUNTIME_DML_TABLES = [
  "agent_runtime.agents",
  "agent_runtime.agent_state",
  "agent_runtime.agent_cycles",
  "agent_runtime.provider_circuits",
  "agent_runtime.provider_capacity_buckets",
  "agent_runtime.provider_capacity_leases",
  "agent_runtime.provider_route_cooldowns",
] as const;

export const RUNTIME_DML_PRIVILEGES = [
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
] as const;

// Paid brains (sql/008_paid_brain_credits.sql): limited grants, each table
// with exactly these privileges and runtime-role.sql revoking the rest.
// credit_ledger is append-only money (never UPDATE/DELETE); paid_calls is the
// per-call state machine, advanced in place by UPDATE but never deleted.
export const RUNTIME_LIMITED_GRANTS: ReadonlyArray<{
  table: string;
  privileges: readonly string[];
}> = [
  { table: "agent_runtime.credit_ledger", privileges: ["SELECT", "INSERT"] },
  {
    table: "agent_runtime.paid_calls",
    privileges: ["SELECT", "INSERT", "UPDATE"],
  },
];

// Sequences behind the ledger's bigserial id: an INSERT calls nextval, which
// needs USAGE. Checked with has_sequence_privilege (see schema.ts); USAGE is
// not a table privilege, so the privilege name alone selects that check.
export const RUNTIME_SEQUENCE_USAGE = [
  "agent_runtime.credit_ledger_id_seq",
] as const;

// Read-only: migration receipts (startup contract).
export const RUNTIME_READ_TABLES = ["agent_runtime.schema_migrations"] as const;

// Column-level reads: the de-Groq startup repair's key ownership check.
export const RUNTIME_COLUMN_READS = [
  { table: 'public."ApiKey"', columns: ["id", "userId", "revokedAt"] },
] as const;

export interface RuntimePrivilegeCheck {
  table: string;
  column: string | null;
  privilege: string;
}

// One check per (object, privilege). PostgreSQL's has_table_privilege with a
// comma-separated list is true when ANY listed privilege is held, so every
// required privilege is asserted on its own.
export function runtimePrivilegeChecks(): RuntimePrivilegeCheck[] {
  return [
    ...RUNTIME_DML_TABLES.flatMap((table) =>
      RUNTIME_DML_PRIVILEGES.map((privilege) => ({
        table,
        column: null,
        privilege,
      })),
    ),
    ...RUNTIME_LIMITED_GRANTS.flatMap(({ table, privileges }) =>
      privileges.map((privilege) => ({
        table,
        column: null,
        privilege,
      })),
    ),
    ...RUNTIME_SEQUENCE_USAGE.map((table) => ({
      table,
      column: null,
      privilege: "USAGE",
    })),
    ...RUNTIME_READ_TABLES.map((table) => ({
      table,
      column: null,
      privilege: "SELECT",
    })),
    ...RUNTIME_COLUMN_READS.flatMap(({ table, columns }) =>
      columns.map((column) => ({ table, column, privilege: "SELECT" })),
    ),
  ];
}
