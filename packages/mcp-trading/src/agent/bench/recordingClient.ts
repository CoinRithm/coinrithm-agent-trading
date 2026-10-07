// Recording side of the bench: a real CoinRithmClient whose transport records
// every READ response into a cassette, and refuses every write.
//
// The recorder sits at the fetch layer (ClientConfig.fetchFn) rather than
// wrapping client methods. That keeps the production client code in the path
// (URL building, auth header, 429 handling, JSON parsing), records the public
// whale reads too, and needs no knowledge of which client method made a call:
// a new read added to observe() is recorded automatically.
//
// Write refusal is structural, not a convention: recording runs the cycle in
// DRY-RUN (live=false) with a stub brain that always skips, so no write should
// ever be attempted. If one is (a mechanical baseline asking for a quote, or a
// future runner change), the recorder records nothing, never forwards it, and
// answers 599 bench_write_refused. Only GET ever reaches the network.

import { ClientConfig, CoinRithmClient, DEFAULT_BASE_URL } from "../client.js";
import { buildAgentDefinitionSnapshot } from "../definitionSnapshot.js";
import { clearPmCalibrationCache } from "../observe.js";
import { Provider } from "../providers.js";
import { runCycle } from "../runner.js";
import { newState } from "../state.js";
import { AgentSpec } from "../types.js";
import {
  basePathOf,
  canonicalJson,
  canonicalRequest,
  Cassette,
  CASSETTE_SCHEMA,
  cassetteId,
  marketBaselineSpec,
  recordingSpec,
  RecordedResponse,
  sha256Hex,
} from "./cassette.js";

export const BENCH_RUN_ID = "bench";
export const BENCH_WRITE_REFUSED = "bench_write_refused";

// Statuses whose Response must carry a null body (the constructor throws
// otherwise).
const NULL_BODY_STATUS = new Set([204, 205, 304]);

export type FetchInput = Parameters<typeof fetch>[0];
export type FetchInit = Parameters<typeof fetch>[1];

export function urlOf(input: FetchInput): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function writeRefusedResponse(): Response {
  return jsonResponse(599, {
    error: BENCH_WRITE_REFUSED,
    message:
      "the bench never forwards writes; recording and replay are dry-run",
  });
}

/** A brain that never calls a model: every cycle is a skip. */
export const SKIP_PROVIDER: Provider = {
  label: "bench-skip",
  decide: async () => ({
    ok: true,
    text: JSON.stringify({ decision: "skip", reason: "bench_no_model" }),
  }),
};

export class ResponseRecorder {
  private readonly entries = new Map<string, RecordedResponse>();
  private readonly frozen = new Set<string>();
  readonly refused: string[] = [];
  readonly fetch: typeof fetch;

  constructor(
    private readonly inner: typeof fetch,
    private readonly basePath: string,
  ) {
    this.fetch = ((input: FetchInput, init?: FetchInit) =>
      this.handle(input, init)) as typeof fetch;
  }

  /**
   * Keep every key recorded so far. A later pass (the baseline's) then only
   * ADDS keys it needs, so all passes replay one consistent snapshot.
   */
  freeze(): void {
    for (const key of this.entries.keys()) this.frozen.add(key);
  }

  responses(): RecordedResponse[] {
    return [...this.entries.values()].sort((a, b) =>
      a.key < b.key ? -1 : a.key > b.key ? 1 : 0,
    );
  }

  private keep(entry: RecordedResponse): void {
    // Last wins within a pass: after 429 retries the final answer is the one
    // the client actually used.
    if (!this.frozen.has(entry.key)) this.entries.set(entry.key, entry);
  }

  private async handle(input: FetchInput, init?: FetchInit): Promise<Response> {
    const req = canonicalRequest(
      init?.method ?? (input instanceof Request ? input.method : "GET"),
      urlOf(input),
      this.basePath,
    );
    if (req.method !== "GET") {
      this.refused.push(req.key);
      return writeRefusedResponse();
    }
    let res: Response;
    try {
      res = await this.inner(input, init);
    } catch (error) {
      this.keep({
        ...req,
        status: 0,
        ok: false,
        data: { error: "network_error" },
        transportError: true,
      });
      throw error;
    }
    const text = await res.text();
    let data: unknown = text;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        /* leave as text, exactly as the client does */
      }
    }
    this.keep({ ...req, status: res.status, ok: res.ok, data });
    return new Response(NULL_BODY_STATUS.has(res.status) ? null : text, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  }
}

/** A production CoinRithmClient whose transport is a ResponseRecorder. */
export class RecordingClient extends CoinRithmClient {
  readonly recorder: ResponseRecorder;

  constructor(cfg: ClientConfig) {
    const recorder = new ResponseRecorder(
      cfg.fetchFn ?? fetch,
      basePathOf(cfg.baseUrl ?? DEFAULT_BASE_URL),
    );
    super({ ...cfg, fetchFn: recorder.fetch });
    this.recorder = recorder;
  }
}

export interface RecordCassetteOptions {
  spec: AgentSpec;
  mergedProse: string;
  apiKey: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  log?: (line: string) => void;
}

/**
 * Record one cassette: run the real runCycle in DRY-RUN through a
 * RecordingClient with a brain that never calls a model, then (for an agent
 * with the pm venue) one more pass as the market-implied baseline so its
 * extra reads are in the same cassette. Each pass starts from a fresh run
 * state, exactly as every bench replay does, so request keys line up.
 */
export async function recordCassette(
  opts: RecordCassetteOptions,
): Promise<Cassette> {
  const client = new RecordingClient({
    apiKey: opts.apiKey,
    baseUrl: opts.baseUrl,
    fetchFn: opts.fetchFn,
  });
  // The own-calibration read is cached per credential for 30 minutes. Clear
  // it so every cassette records the read instead of inheriting a cache hit.
  clearPmCalibrationCache();
  const result = await runCycle({
    client,
    provider: SKIP_PROVIDER,
    spec: recordingSpec(opts.spec),
    mergedProse: opts.mergedProse,
    state: newState(BENCH_RUN_ID),
    live: false,
    log: opts.log,
  });
  client.recorder.freeze();

  const marketBaselineRecorded = opts.spec.venues.includes("pm");
  if (marketBaselineRecorded) {
    clearPmCalibrationCache();
    await runCycle({
      client,
      provider: SKIP_PROVIDER,
      spec: marketBaselineSpec(opts.spec),
      mergedProse: "",
      state: newState(BENCH_RUN_ID),
      live: false,
    });
  }

  const responses = client.recorder.responses();
  // A trades cursor predates subsequent reads. Scoring from it would allow
  // prices inside the input-collection window to count as future outcomes.
  const clockMs = Date.now();
  const recordedAt = new Date(clockMs).toISOString();
  const asOf = recordedAt;
  return {
    schema: CASSETTE_SCHEMA,
    id: cassetteId(asOf, sha256Hex(canonicalJson(responses))),
    recordedAt,
    clockMs,
    asOf,
    agentSpecHash: buildAgentDefinitionSnapshot(opts.spec, opts.mergedProse)
      .definitionHash,
    spec: opts.spec,
    marketBaselineRecorded,
    recordCycle: {
      decision: result.decision,
      ...(result.decisionType ? { decisionType: result.decisionType } : {}),
      ...(result.skipReason ? { skipReason: result.skipReason } : {}),
    },
    refusedRequests: [...client.recorder.refused],
    responses,
  };
}
