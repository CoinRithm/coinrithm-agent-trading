import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fileURLToPath } from "node:url";
import type { Server } from "node:http";

const mocks = vi.hoisted(() => ({
  config: vi.fn(),
  log: vi.fn(),
  listen: vi.fn(),
}));
vi.mock("./client.js", async (original) => ({
  ...(await original<typeof import("./client.js")>()),
  loadHttpConfig: mocks.config,
  log: mocks.log,
}));
vi.mock("express", async (original) => {
  const actual = await original<typeof import("express")>();
  const factory = Object.assign(() => {
    const app = actual.default();
    vi.spyOn(app, "listen").mockImplementation(mocks.listen);
    return app;
  }, actual.default);
  return { ...actual, default: factory };
});
const originalArgv = process.argv;
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  process.argv = [
    originalArgv[0],
    fileURLToPath(new URL("./http.ts", import.meta.url)),
  ];
  mocks.config.mockReturnValue({ baseUrl: "http://fixture.invalid" });
  mocks.listen.mockImplementation((_port: number, ready: () => void) => {
    ready();
    return {} as Server;
  });
  vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
});
afterEach(() => {
  process.argv = originalArgv;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("HTTP executable startup", () => {
  it.each([
    ["", 8787],
    ["4321", 4321],
  ])(
    "starts the configured port %s without a global credential",
    async (envPort, expected) => {
      vi.stubEnv("PORT", envPort);
      await import("./http.js");
      expect(mocks.listen).toHaveBeenCalledWith(expected, expect.any(Function));
      expect(mocks.log).toHaveBeenCalledWith(
        expect.stringContaining(`:${expected}/mcp`),
      );
      expect(process.exit).not.toHaveBeenCalled();
    },
  );
  it.each([new Error("fixture startup failure"), "fixture startup failure"])(
    "exits on a startup failure",
    async (error) => {
      mocks.config.mockImplementation(() => {
        throw error;
      });
      await import("./http.js");
      expect(mocks.listen).not.toHaveBeenCalled();
      expect(mocks.log).toHaveBeenCalledWith(
        "fatal:",
        "fixture startup failure",
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    },
  );
  it("does not listen when imported without an executable entrypoint", async () => {
    process.argv = [];
    await import("./http.js");
    expect(mocks.listen).not.toHaveBeenCalled();
    expect(mocks.config).not.toHaveBeenCalled();
  });
});
