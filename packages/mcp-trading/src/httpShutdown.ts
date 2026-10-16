// Graceful stop for the hosted HTTP entry (audit 2026-10-16). Before this a
// deploy's SIGTERM killed the process at once, cutting every in-flight tool
// call. Now a stop signal flips the server into draining: /healthz answers 503
// so the proxy stops routing here, the listener stops accepting, open requests
// finish, and the process exits when the last one closes or the grace period
// ends, whichever is first. The grace period stays under Docker's default
// 10 s stop timeout so the drain is never cut short by SIGKILL.
import type { Server } from "node:http";

export const SHUTDOWN_GRACE_MS = 8_000;

export type DrainState = { draining: boolean };

export function installGracefulShutdown(
  server: Pick<Server, "close" | "closeAllConnections">,
  options: {
    state: DrainState;
    graceMs?: number;
    log?: (...args: unknown[]) => void;
    exit?: (code: number) => void;
    signals?: NodeJS.Signals[];
    onSignal?: (signal: NodeJS.Signals, handler: () => void) => void;
  },
): (signal: NodeJS.Signals) => void {
  const graceMs = options.graceMs ?? SHUTDOWN_GRACE_MS;
  const exit = options.exit ?? ((code: number) => process.exit(code));
  const say = options.log ?? (() => {});
  let done = false;
  const finish = (reason: string) => {
    if (done) return;
    done = true;
    say(`shutdown: ${reason}`);
    exit(0);
  };
  const begin = (signal: NodeJS.Signals) => {
    if (options.state.draining) return;
    options.state.draining = true;
    say(`${signal}: draining, up to ${graceMs} ms for open requests`);
    server.close(() => finish("all requests closed"));
    const timer = setTimeout(() => {
      server.closeAllConnections();
      finish("grace period ended");
    }, graceMs);
    timer.unref?.();
  };
  const listen =
    options.onSignal ??
    ((signal: NodeJS.Signals, handler: () => void) => {
      process.once(signal, handler);
    });
  for (const signal of options.signals ?? ["SIGTERM", "SIGINT"]) {
    listen(signal, () => begin(signal));
  }
  return begin;
}
