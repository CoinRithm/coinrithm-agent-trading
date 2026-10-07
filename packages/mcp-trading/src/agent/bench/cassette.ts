// Bench cassettes: the recorded READ inputs of one agent cycle.
//
// A cassette is the source of truth the bench replays. It holds every read
// response the real production runner made in one dry-run cycle (status, body,
// keyed by a canonical request key), the clock it was recorded at, and the
// recorded agent's spec (needed to replay the built-in baselines on the same
// inputs). It never holds request headers, so no API key reaches a cassette.
// It DOES hold the recording account's paper reads (wallet, positions), so
// keep a corpus as private as the account it was recorded from.
//
// Why not replay the stored `decision_input_record`: that record declares
// itself partial (prompts, news and journal excluded, byte budget) and carries
// no replay guarantee. Inputs are therefore recorded going forward, in full.

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { AgentSpec, DEFAULT_TRIGGER_POLICY } from "../types.js";
import { sortDeep } from "../util.js";
import { LabelFile, parseLabelFile } from "./labels.js";

export const CASSETTE_SCHEMA = "coinrithm.bench.cassette.v1";

export interface RecordedResponse {
  /** Canonical request key: METHOD + path + sorted query. */
  key: string;
  method: string;
  path: string;
  query: Record<string, string>;
  status: number;
  ok: boolean;
  /** The body as the client parses it: JSON when it parses, else the text. */
  data: unknown;
  /** The recorded request failed in transport (no HTTP response at all). */
  transportError?: boolean;
}

export interface Cassette {
  schema: typeof CASSETTE_SCHEMA;
  id: string;
  recordedAt: string;
  /** Epoch ms the replay clock starts from (Date.now during replay). */
  clockMs: number;
  /** Cutoff after ALL recording reads, including baseline-only inputs. */
  asOf: string;
  /** definitionHash of the recorded spec + prose (see definitionSnapshot). */
  agentSpecHash: string;
  spec: AgentSpec;
  /** True when the market-implied baseline's extra reads were recorded too. */
  marketBaselineRecorded: boolean;
  recordCycle: { decision: string; decisionType?: string; skipReason?: string };
  /** Non-GET requests the recorder refused to forward (never sent). */
  refusedRequests: string[];
  responses: RecordedResponse[];
}

export interface CanonicalRequest {
  key: string;
  method: string;
  path: string;
  query: Record<string, string>;
}

/**
 * Canonical request identity used for both recording and replay: upper-cased
 * method, the path relative to the API base path, and the query parameters
 * sorted by name. The host is deliberately not part of the key, so a cassette
 * recorded against one base URL replays against the bench's fake one.
 */
export function canonicalRequest(
  method: string,
  url: string,
  basePath = "",
): CanonicalRequest {
  const u = new URL(url);
  const base = basePath.replace(/\/+$/, "");
  let path = u.pathname;
  if (base && (path === base || path.startsWith(`${base}/`)))
    path = path.slice(base.length) || "/";
  const params = new URLSearchParams(u.search);
  params.sort();
  const query: Record<string, string> = {};
  params.forEach((value, name) => {
    query[name] = value;
  });
  const qs = params.toString();
  const m = method.toUpperCase();
  return { key: `${m} ${path}${qs ? `?${qs}` : ""}`, method: m, path, query };
}

/** The path prefix of an API base URL ("" for a host-root base). */
export function basePathOf(baseUrl: string): string {
  return new URL(baseUrl).pathname.replace(/\/+$/, "");
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** Sorted-key JSON, the same canonicalization the scorecard hash relies on. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

/**
 * The spec a recording pass runs with: the agent's own spec with its gate
 * forced to fire, so the post-gate reads (whale context) are always recorded
 * and a variant whose gate fires on replay finds them in the cassette.
 */
export function recordingSpec(spec: AgentSpec): AgentSpec {
  return {
    ...spec,
    triggerPolicy: {
      ...(spec.triggerPolicy ?? DEFAULT_TRIGGER_POLICY),
      mode: "always",
    },
  };
}

/**
 * The market-implied baseline: the recorded agent's spec and caps with the
 * deterministic mechanical "market-implied" strategy as its brain (mechanical
 * .ts). Its observe() reads differ slightly from an LLM agent's (uncurated PM
 * board), which is why recording runs it once too.
 */
export function marketBaselineSpec(spec: AgentSpec): AgentSpec {
  return {
    ...recordingSpec(spec),
    model: { provider: "mechanical", name: "market-implied" },
  };
}

function stampOf(asOf: string): string {
  const stamp = asOf
    .replace(/[^0-9A-Za-z]+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "");
  return stamp || "cassette";
}

/** Filesystem-safe, content-addressed cassette id: asOf stamp + body hash. */
export function cassetteId(asOf: string, contentHash: string): string {
  return `${stampOf(asOf)}-${contentHash.slice(0, 12)}`;
}

export function writeCassette(dir: string, cassette: Cassette): string {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${cassette.id}.json`);
  writeFileSync(file, `${JSON.stringify(cassette, null, 2)}\n`, "utf8");
  return file;
}

/** Validate a parsed cassette. Throws on a malformed one (fail closed). */
export function parseCassette(value: unknown, source: string): Cassette {
  const c = (value ?? {}) as Partial<Cassette>;
  const problems: string[] = [];
  if (c.schema !== CASSETTE_SCHEMA) problems.push("schema");
  if (typeof c.id !== "string" || !/^[0-9A-Za-z-]{1,80}$/.test(c.id))
    problems.push("id");
  if (typeof c.asOf !== "string" || !Number.isFinite(Date.parse(c.asOf)))
    problems.push("asOf");
  if (typeof c.clockMs !== "number" || !Number.isFinite(c.clockMs))
    problems.push("clockMs");
  if (!c.spec || typeof c.spec !== "object" || !Array.isArray(c.spec.venues))
    problems.push("spec");
  if (
    !Array.isArray(c.responses) ||
    c.responses.some(
      (r) =>
        !r ||
        typeof r.key !== "string" ||
        typeof r.path !== "string" ||
        typeof r.status !== "number",
    )
  )
    problems.push("responses");
  if (problems.length > 0)
    throw new Error(
      `cassette ${source} is invalid (${problems.join(", ")}); re-record it`,
    );
  return {
    ...(c as Cassette),
    marketBaselineRecorded: c.marketBaselineRecorded === true,
    refusedRequests: Array.isArray(c.refusedRequests) ? c.refusedRequests : [],
  };
}

export interface Corpus {
  cassettes: Cassette[];
  labels: Record<string, LabelFile>;
  /** Top-level .json files that are not cassettes (e.g. a saved report). */
  ignored: string[];
}

/**
 * Read every cassette at the top level of `dir` plus the optional
 * `labels/<cassetteId>.json` files. A JSON file with the cassette schema that
 * fails validation, or a malformed label file, stops the bench: a silently
 * skipped input would bias the comparison.
 */
export function readCorpus(dir: string): Corpus {
  const cassettes: Cassette[] = [];
  const ignored: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith(".json")) continue;
    const file = join(dir, name);
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      throw new Error(
        `corpus file ${name} is not valid JSON; repair or explicitly remove it before comparing variants`,
      );
    }
    if ((parsed as { schema?: unknown } | null)?.schema !== CASSETTE_SCHEMA) {
      ignored.push(name);
      continue;
    }
    cassettes.push(parseCassette(parsed, name));
  }
  const ids = new Set<string>();
  for (const c of cassettes) {
    if (ids.has(c.id)) throw new Error(`duplicate cassette id ${c.id}`);
    ids.add(c.id);
  }
  const labels: Record<string, LabelFile> = {};
  for (const c of cassettes) {
    const file = join(dir, "labels", `${c.id}.json`);
    if (!existsSync(file)) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
      throw new Error(
        `label file labels/${c.id}.json is not valid JSON: ${(e as Error).message}`,
      );
    }
    labels[c.id] = parseLabelFile(parsed, `labels/${c.id}.json`);
  }
  return { cassettes, labels, ignored };
}
