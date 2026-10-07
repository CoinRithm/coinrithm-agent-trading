import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  basePathOf,
  canonicalRequest,
  Cassette,
  CASSETTE_SCHEMA,
  cassetteId,
  marketBaselineSpec,
  parseCassette,
  readCorpus,
  recordingSpec,
  writeCassette,
} from "./cassette.js";
import { parseSkill } from "../skill.js";
import { renderFolderOfOne } from "../templates.js";

const spec = parseSkill(
  renderFolderOfOne("cassette-agent", "conservative"),
).spec;

function cassette(over: Partial<Cassette> = {}): Cassette {
  return {
    schema: CASSETTE_SCHEMA,
    id: "2026-10-07T10-00-00-000Z-abcdef012345",
    recordedAt: "2026-10-07T10:00:01.000Z",
    clockMs: Date.parse("2026-10-07T10:00:01.000Z"),
    asOf: "2026-10-07T10:00:00.000Z",
    agentSpecHash: "sha256:x",
    spec,
    marketBaselineRecorded: false,
    recordCycle: { decision: "skip" },
    refusedRequests: [],
    responses: [
      {
        key: "GET /api/agent/me",
        method: "GET",
        path: "/api/agent/me",
        query: {},
        status: 200,
        ok: true,
        data: { scopes: [] },
      },
    ],
    ...over,
  };
}

let dir: string | undefined;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("canonical request keys", () => {
  it("upper-cases the method and sorts query parameters by name", () => {
    const a = canonicalRequest(
      "get",
      "https://api.coinrithm.com/api/agent/pm/discover?q=Bitcoin&limit=30",
    );
    const b = canonicalRequest(
      "GET",
      "https://other.host/api/agent/pm/discover?limit=30&q=Bitcoin",
    );
    expect(a.key).toBe("GET /api/agent/pm/discover?limit=30&q=Bitcoin");
    expect(b.key).toBe(a.key);
    expect(a.query).toEqual({ limit: "30", q: "Bitcoin" });
    expect(a.method).toBe("GET");
  });

  it("strips the API base path and keeps a bare path without a query mark", () => {
    const r = canonicalRequest(
      "POST",
      "http://api:4000/v1/api/agent/me",
      basePathOf("http://api:4000/v1/"),
    );
    expect(r.key).toBe("POST /api/agent/me");
    expect(canonicalRequest("GET", "http://h/v1", "/v1").path).toBe("/");
    expect(basePathOf("https://api.coinrithm.com")).toBe("");
  });
});

describe("cassette helpers", () => {
  it("builds filesystem-safe ids and forces the gate on for recording", () => {
    expect(cassetteId("2026-10-07T10:00:00.000Z", "abcdef0123456789")).toBe(
      "2026-10-07T10-00-00-000Z-abcdef012345",
    );
    expect(cassetteId("::", "abcdef0123456789")).toBe("cassette-abcdef012345");
    expect(recordingSpec(spec).triggerPolicy?.mode).toBe("always");
    const baseline = marketBaselineSpec(spec);
    expect(baseline.model).toEqual({
      provider: "mechanical",
      name: "market-implied",
    });
    expect(baseline.risk).toEqual(spec.risk);
  });

  it("rejects malformed cassettes and defaults optional fields", () => {
    expect(() => parseCassette({}, "x.json")).toThrow(
      /schema, id, asOf, clockMs, spec, responses/,
    );
    expect(() =>
      parseCassette({ ...cassette(), responses: [{ key: 1 }] }, "x.json"),
    ).toThrow(/responses/);
    const loose = parseCassette(
      {
        ...cassette(),
        marketBaselineRecorded: "yes",
        refusedRequests: undefined,
      },
      "x.json",
    );
    expect(loose.marketBaselineRecorded).toBe(false);
    expect(loose.refusedRequests).toEqual([]);
  });

  it("reads a corpus with labels, ignoring non-cassette json", () => {
    dir = mkdtempSync(join(tmpdir(), "cr-bench-corpus-"));
    const c = cassette();
    writeCassette(dir, c);
    writeFileSync(join(dir, "report.json"), JSON.stringify({ schema: "x" }));
    writeFileSync(join(dir, "broken.json"), "{not json");
    writeFileSync(join(dir, "notes.txt"), "hello");
    mkdirSync(join(dir, "labels"));
    writeFileSync(
      join(dir, "labels", `${c.id}.json`),
      JSON.stringify({ pm: { "a/b/c": { settled: 1 } } }),
    );
    const corpus = readCorpus(dir);
    expect(corpus.cassettes.map((x) => x.id)).toEqual([c.id]);
    expect(corpus.ignored).toEqual(["broken.json", "report.json"]);
    expect(corpus.labels[c.id].pm).toEqual({ "a/b/c": { settled: 1 } });
  });

  it("fails closed on a bad label file or duplicate ids", () => {
    dir = mkdtempSync(join(tmpdir(), "cr-bench-corpus-"));
    const c = cassette();
    writeCassette(dir, c);
    mkdirSync(join(dir, "labels"));
    writeFileSync(join(dir, "labels", `${c.id}.json`), "{nope");
    expect(() => readCorpus(dir!)).toThrow(/not valid JSON/);
    writeFileSync(
      join(dir, "labels", `${c.id}.json`),
      JSON.stringify({ pm: { "a/b/c": { settled: 2 } } }),
    );
    expect(() => readCorpus(dir!)).toThrow(/settled must be 0 or 1/);
    writeFileSync(join(dir, "copy.json"), JSON.stringify(c));
    expect(() => readCorpus(dir!)).toThrow(/duplicate cassette id/);
  });
});
