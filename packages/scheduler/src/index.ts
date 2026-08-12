// Entrypoint for the hosted agent runtime. Stateless: all agent definitions,
// state, and cycle history live in Postgres (agent_runtime schema). Scale out by
// running more replicas — the row lock (FOR UPDATE SKIP LOCKED) shares the load.

import { createServer } from "node:http";
import { loadConfig } from "./config.js";
import {
  createPool,
  migrate,
  migrateHouseAgentsOffGroq,
  retryDatabaseStartup,
} from "./db.js";
import { runScheduler, type Control } from "./scheduler.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const pool = createPool(config.databaseUrl);
  // A database container restart is operationally routine, not a fatal setup
  // error. Stay alive and reconnect with bounded backoff instead of exhausting
  // Coolify's process-restart budget while Postgres is still recovering.
  await retryDatabaseStartup(() => migrate(pool), {
    onRetry: (attempt, delayMs, code) =>
      console.error(
        `[scheduler] database unavailable (${code}); startup retry ${attempt} in ${delayMs}ms`,
      ),
  });
  console.log("[scheduler] agent_runtime schema ready");
  const deGroqed = await migrateHouseAgentsOffGroq(pool);
  if (deGroqed > 0)
    console.log(
      `[scheduler] de-Groq: moved ${deGroqed} house agent(s) off Groq -> NVIDIA (free 6k TPM can't fit our prompt)`,
    );

  const control: Control = { stopped: false };

  // Liveness heartbeat shared with the poll loop. The health endpoint reports
  // UNHEALTHY when the loop hasn't ticked recently, so an orchestrator restarts a
  // HUNG scheduler (a static "ok" can't tell a frozen loop from a healthy one).
  const heartbeat = { lastTickAt: Date.now() };
  const HEARTBEAT_STALE_MS = 360_000; // > the worst-case slow tick (300s model timeout + overhead)
  if (config.healthPort) {
    createServer((_req, res) => {
      const ageMs = Date.now() - heartbeat.lastTickAt;
      const ok = ageMs < HEARTBEAT_STALE_MS;
      res.writeHead(ok ? 200 : 503, { "content-type": "text/plain" });
      res.end(
        ok
          ? `ok · last tick ${Math.round(ageMs / 1000)}s ago`
          : `stale · no tick in ${Math.round(ageMs / 1000)}s`,
      );
    }).listen(config.healthPort, () =>
      console.log(`[scheduler] health on :${config.healthPort}`),
    );
  }

  let shuttingDown = false;
  const shutdown = (sig: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[scheduler] ${sig} — draining current tick…`);
    control.stopped = true;
    // Hard backstop so a stuck cycle can't block the redeploy forever.
    setTimeout(() => process.exit(0), 30_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  await runScheduler(pool, config, control, undefined, undefined, heartbeat);
  await pool.end();
  process.exit(0);
}

// Defense in depth: never let a stray rejection silently wedge the process; a
// truly uncaught exception is unsafe to continue from, so exit and let the
// orchestrator restart cleanly (state is in the DB, so a restart loses nothing).
process.on("unhandledRejection", (reason) => {
  console.error(
    "[scheduler] unhandledRejection:",
    reason instanceof Error ? reason.message : reason,
  );
});
process.on("uncaughtException", (err) => {
  console.error("[scheduler] uncaughtException:", err);
  process.exit(1);
});

main().catch((e) => {
  console.error("[scheduler] fatal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
