import { afterEach, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { CoinRithmClient } from "./client.js";
import { createHttpApp } from "./http.js";
import { installGracefulShutdown, type DrainState } from "./httpShutdown.js";
import { SERVER_VERSION } from "./version.js";

const open: Server[] = [];
afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(
    open
      .splice(0)
      .map((s) => new Promise<void>((resolve) => s.close(() => resolve()))),
  );
});

function fakeServer() {
  let onClosed: (() => void) | undefined;
  return {
    close: vi.fn((cb?: (err?: Error) => void) => {
      onClosed = () => cb?.();
    }),
    closeAllConnections: vi.fn(),
    lastRequestClosed: () => onClosed?.(),
  };
}

function install(server: ReturnType<typeof fakeServer>, state: DrainState) {
  const handlers = new Map<string, () => void>();
  const exit = vi.fn();
  installGracefulShutdown(server as unknown as Server, {
    state,
    graceMs: 1_000,
    exit,
    onSignal: (signal, handler) => handlers.set(signal, handler),
  });
  return { handlers, exit };
}

describe("graceful shutdown", () => {
  it("drains on SIGTERM and exits once the last request closes", () => {
    const state: DrainState = { draining: false };
    const server = fakeServer();
    const { handlers, exit } = install(server, state);
    handlers.get("SIGTERM")!();
    expect(state.draining).toBe(true);
    expect(server.close).toHaveBeenCalledOnce();
    expect(exit).not.toHaveBeenCalled();
    server.lastRequestClosed();
    expect(exit).toHaveBeenCalledWith(0);
    expect(server.closeAllConnections).not.toHaveBeenCalled();
  });

  it("cuts remaining connections when the grace period ends, and exits once", () => {
    vi.useFakeTimers();
    const state: DrainState = { draining: false };
    const server = fakeServer();
    const { handlers, exit } = install(server, state);
    handlers.get("SIGINT")!();
    handlers.get("SIGTERM")!(); // a second signal does not restart the drain
    expect(server.close).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1_000);
    expect(server.closeAllConnections).toHaveBeenCalledOnce();
    server.lastRequestClosed();
    expect(exit).toHaveBeenCalledOnce();
  });

  it("health reports the version, and 503 while draining", async () => {
    const drain: DrainState = { draining: false };
    const app = createHttpApp(
      new CoinRithmClient({ baseUrl: "http://127.0.0.1:9" }),
      { drain },
    );
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    open.push(server);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const live = await fetch(`${base}/healthz`);
    expect(live.status).toBe(200);
    expect(await live.json()).toEqual({
      ok: true,
      service: "coinrithm-mcp",
      transport: "streamable-http",
      version: SERVER_VERSION,
    });

    drain.draining = true;
    const stopping = await fetch(`${base}/health`);
    expect(stopping.status).toBe(503);
    expect(await stopping.json()).toMatchObject({ ok: false, draining: true });
  });
});
