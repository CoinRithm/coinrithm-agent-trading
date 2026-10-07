import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdBench, cmdNew, cmdRecord, main } from "./cli.js";
import type { Provider } from "./providers.js";

let directory: string;
let folder: string;
let corpusDir: string;

// Real response shapes for a futures agent's observe() reads; anything else
// (candles here) answers 404, which observe tolerates.
function fakeApi() {
  const routes: Record<string, unknown> = {
    "/api/agent/me": { scopes: ["read", "trade:futures"] },
    "/api/agent/portfolio": { equity: { totalUsd: 1000, availableUsd: 1000 } },
    "/api/agent/wallet": { usdt: { available: 1000 } },
    "/api/agent/positions/futures": { positions: [] },
    "/api/agent/trades": { asOf: "2026-10-07T10:00:00.000Z", trades: [] },
    "/api/agent/resolve": { match: { coinId: "1", name: "Bitcoin" } },
    "/api/agent/market/1": {
      price: { usd: 62000 },
      observation: { freshness: { status: "fresh" } },
    },
  };
  return vi.fn(async (input: unknown, init?: { method?: string }) => {
    if ((init?.method ?? "GET") !== "GET")
      throw new Error("a write reached the transport");
    const body = routes[new URL(String(input)).pathname];
    return body === undefined
      ? new Response("{}", { status: 404 })
      : new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
}

const skipBrain: Provider = {
  label: "fixture",
  decide: async () => ({
    ok: true,
    text: JSON.stringify({ decision: "skip", reason: "fixture" }),
  }),
};

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "cr-cli-bench-"));
  folder = join(directory, "agent");
  corpusDir = join(directory, "corpus");
  cmdNew(folder);
  vi.stubEnv("COINRITHM_API_KEY", "fixture-paper-key");
  vi.stubEnv("COINRITHM_API_URL", "https://fixture.example.test");
  vi.stubEnv("COINRITHM_AGENT_DISABLE_SKILLS", "0");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected network call from CLI fixture");
    }),
  );
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  rmSync(directory, { recursive: true, force: true });
});

describe("record + bench CLI", () => {
  it("records cassettes at the requested pace, then benches two variants on them", async () => {
    let now = Date.parse("2026-10-07T10:00:00.000Z");
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const sleepFn = vi.fn(async (ms: number) => {
      now += ms;
    });
    const rec = await cmdRecord(folder, {
      out: corpusDir,
      cycles: 2,
      every: "5m",
      fetchFn: fakeApi(),
      sleepFn,
    });
    expect(rec.ok).toBe(true);
    expect(sleepFn).toHaveBeenCalledTimes(1);
    expect(sleepFn).toHaveBeenCalledWith(300_000);
    expect(rec.lines[0]).toContain("record DRY-RUN");
    // The same trades cursor does not erase a later observation window.
    const recordings = readdirSync(corpusDir).filter((f) =>
      f.endsWith(".json"),
    );
    expect(recordings).toHaveLength(2);
    expect(
      recordings
        .map((f) => JSON.parse(readFileSync(join(corpusDir, f), "utf8")).asOf)
        .sort(),
    ).toEqual(["2026-10-07T10:00:00.000Z", "2026-10-07T10:05:00.000Z"]);

    const out = join(directory, "report.json");
    const bench = await cmdBench({
      corpus: corpusDir,
      variants: [`a=${folder}`, `b=${folder}`],
      repeats: 2,
      seed: 7,
      out,
      providerFor: () => skipBrain,
    });
    expect(bench.ok).toBe(true);
    expect(bench.lines.join("\n")).toMatch(/a vs b: overlap 1/);
    expect(existsSync(out)).toBe(true);
    const report = JSON.parse(readFileSync(out, "utf8"));
    expect(report.contentHash).toBe(
      (bench.data as { contentHash: string }).contentHash,
    );
    // A futures-only agent has no market-implied baseline; skip still runs.
    expect(Object.keys(report.variants).sort()).toEqual([
      "a",
      "b",
      "baseline:skip",
    ]);

    // The saved report sits next to the corpus without breaking a re-run.
    const again = await cmdBench({
      corpus: directory,
      variants: [`a=${folder}`],
      repeats: 1,
      providerFor: () => skipBrain,
    });
    expect(again.ok).toBe(false);
    expect(again.lines.join("\n")).toMatch(/no cassettes/);
  });

  it("validates record options before any read", async () => {
    const fetchFn = fakeApi();
    expect((await cmdRecord(folder, {})).lines[0]).toMatch(/--out/);
    expect(
      (await cmdRecord(folder, { out: corpusDir, cycles: 0, fetchFn })).ok,
    ).toBe(false);
    expect(
      (await cmdRecord(folder, { out: corpusDir, every: "soon", fetchFn }))
        .lines[0],
    ).toMatch(/not a cadence/);
    expect(
      (await cmdRecord(join(directory, "missing"), { out: corpusDir })).ok,
    ).toBe(false);
    vi.stubEnv("COINRITHM_API_KEY", "");
    expect(
      (await cmdRecord(folder, { out: corpusDir, fetchFn })).lines[0],
    ).toMatch(/COINRITHM_API_KEY/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("validates bench options and fails closed", async () => {
    await cmdRecord(folder, { out: corpusDir, fetchFn: fakeApi() });
    const run = (over: Parameters<typeof cmdBench>[0]) =>
      cmdBench({
        corpus: corpusDir,
        variants: [`a=${folder}`],
        providerFor: () => skipBrain,
        ...over,
      });
    expect((await run({ corpus: undefined })).lines[0]).toMatch(/--corpus/);
    expect((await run({ variants: [] })).lines[0]).toMatch(/--variant/);
    expect((await run({ seed: -1 })).lines[0]).toMatch(/--seed/);
    expect((await run({ variants: ["a"] })).lines[0]).toMatch(
      /name=<agentPath>/,
    );
    expect(
      (await run({ variants: [`a=${join(directory, "missing")}`] })).ok,
    ).toBe(false);
    expect(
      (
        await run({
          providerFor: () => {
            throw new Error("missing model API key");
          },
        })
      ).lines[0],
    ).toMatch(/variant a: missing model API key/);
    expect((await run({ repeats: 0 })).lines.join("\n")).toMatch(/repeats/);
    expect((await run({ corpus: join(directory, "nope") })).ok).toBe(false);
  });

  it("dispatches record and bench from main", async () => {
    expect(await main(["record", folder])).toBe(1);
    expect(await main(["bench", "--variant", "a"])).toBe(1);
    expect(
      await main(["record", folder, "--out", corpusDir, "--cycles", "x"]),
    ).toBe(1);
    expect(
      await main([
        "bench",
        "--corpus",
        corpusDir,
        "--repeats",
        "2",
        "--seed",
        "3",
        "--no-baselines",
      ]),
    ).toBe(1);
  });
});
