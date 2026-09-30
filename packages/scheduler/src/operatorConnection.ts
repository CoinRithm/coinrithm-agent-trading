// Operator scripts that write beyond the scheduler runtime grants (house
// rollout writes agent_runtime.agent_revisions; the benchmark identity seed
// writes public."User" and public."ApiKey") take their own connection from
// OPERATOR_DATABASE_URL, supplied at run time through the secret manager and
// never configured on the scheduler application. They refuse to run as the
// runtime role, so a script started with the application's environment stops
// before its first statement instead of failing halfway.
import type { Pool } from "pg";

export const OPERATOR_DATABASE_URL_ENV = "OPERATOR_DATABASE_URL";
export const RUNTIME_ROLE = "coinrithm_scheduler";

export function operatorDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const url = env[OPERATOR_DATABASE_URL_ENV]?.trim();
  if (!url) {
    throw new Error(
      `${OPERATOR_DATABASE_URL_ENV} is required: this script writes beyond the scheduler runtime grants. Supply an operator connection at run time; do not configure it on the scheduler application.`,
    );
  }
  return url;
}

export async function assertOperatorConnection(
  pool: Pick<Pool, "query">,
  script: string,
): Promise<void> {
  const { rows } = await pool.query<{ role: string }>(
    "SELECT current_user AS role",
  );
  if (rows[0]?.role === RUNTIME_ROLE) {
    throw new Error(
      `${script} must not run as ${RUNTIME_ROLE}: it writes tables the runtime role is not granted. Use ${OPERATOR_DATABASE_URL_ENV}.`,
    );
  }
}
