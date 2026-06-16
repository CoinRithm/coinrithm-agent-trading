// Entrypoint for the hosted agent runtime. Stateless: all agent definitions,
// state, and cycle history live in Postgres (agent_runtime schema). Scale out by
// running more replicas — the row lock (FOR UPDATE SKIP LOCKED) shares the load.

import { createServer } from "node:http";
import { loadConfig } from "./config.js";
import { createPool, migrate } from "./db.js";
import { runScheduler, type Control } from "./scheduler.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const pool = createPool(config.databaseUrl);
  await migrate(pool);
  console.log("[scheduler] agent_runtime schema ready");

  const control: Control = { stopped: false };

  if (config.healthPort) {
    createServer((_req, res) => {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
    }).listen(config.healthPort, () => console.log(`[scheduler] health on :${config.healthPort}`));
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

  await runScheduler(pool, config, control);
  await pool.end();
  process.exit(0);
}

// Defense in depth: never let a stray rejection silently wedge the process; a
// truly uncaught exception is unsafe to continue from, so exit and let the
// orchestrator restart cleanly (state is in the DB, so a restart loses nothing).
process.on("unhandledRejection", (reason) => {
  console.error("[scheduler] unhandledRejection:", reason instanceof Error ? reason.message : reason);
});
process.on("uncaughtException", (err) => {
  console.error("[scheduler] uncaughtException:", err);
  process.exit(1);
});

main().catch((e) => {
  console.error("[scheduler] fatal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
