// BYO-model provider layer. The user's model API key comes from the ENV ONLY,
// never from an agent file. One call returns one chunk of text that must be a
// single structured-JSON decision (parsed in decision.ts). No free-form tool
// execution — the model only proposes; the runner disposes.

import { AgentSpec, ProviderName } from "./types.js";
import {
  chatShapeFor,
  buildChatBody,
  DECISION_TOOL_NAME,
  NVIDIA_BASE_URL as CAP_NVIDIA_BASE_URL,
} from "./providerCapabilities.js";

export interface DecideInput {
  system: string;
  user: string;
  maxTokens?: number;
  // Abort the model call after this many ms so a slow/hung provider can never
  // bleed past the agent's cadence. Default DEFAULT_TIMEOUT_MS.
  timeoutMs?: number;
}

export interface DecideRouteAttempt {
  provider: string;
  model: string;
  outcome: "success" | "failed" | "deferred";
  failureClass?: "capacity" | "permanent" | "transient" | "malformed";
  status?: number;
  retryAfterMs?: number;
  latencyMs: number;
  error?: string;
}

export interface DecideRouteMeta {
  policyVersion: string;
  profile: "fast" | "strong" | "configured";
  effectiveProvider?: string;
  effectiveModel?: string;
  reason:
    | "configured"
    | "circuit_fallback"
    | "capacity_fallback"
    | "provider_fallback"
    | "malformed_fallback"
    | "byo";
  attempts: DecideRouteAttempt[];
}

export type DecideResult =
  | {
      ok: true;
      text: string;
      // Provider-reported token usage when available (for slice-2 metering).
      usage?: { promptTokens: number; completionTokens: number };
      route?: DecideRouteMeta;
    }
  | {
      ok: false;
      error: string;
      // Structured failure metadata (slice A2, Codex amendment 2026-08-26):
      // the router must classify 429 (capacity: fall back / cool down NOW)
      // separately from 5xx/timeout (transient thresholds) without string
      // sniffing. Absent on network/timeout errors that carry no response.
      status?: number;
      // Parsed Retry-After (seconds or HTTP-date form), capped; the capacity
      // layer treats it as the provider's own cooldown request.
      retryAfterMs?: number;
      // True when no provider call happened (all eligible routes were held or
      // over shared capacity). This is backpressure, not a model failure.
      deferred?: boolean;
      route?: DecideRouteMeta;
    };

export interface Provider {
  label: string;
  decide(input: DecideInput): Promise<DecideResult>;
}

export interface ProviderEnv {
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GROQ_API_KEY?: string;
  NVIDIA_API_KEY?: string;
  GEMINI_API_KEY?: string;
  MODEL_API_KEY?: string;
}

// NVIDIA NIM is OpenAI-compatible; the `nvidia` preset hard-wires the hosted
// endpoint so an agent only needs `{ provider: nvidia, name: "<model id>" }`.
const NVIDIA_BASE_URL = CAP_NVIDIA_BASE_URL;

// Gemini exposes an OpenAI-compatible surface, so the `gemini` preset hard-wires
// its hosted endpoint — an agent only needs `{ provider: gemini, name: "gemini-2.0-flash" }`
// plus a GEMINI_API_KEY. The free tier (no credit card, generous Flash quota) makes
// it the easiest key a USER can bring for their OWN agent — and a per-user key means
// each agent draws on its own quota, which is how the fleet actually scales.
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai";

// Cap any single model call so a hung provider can't block an agent forever — but
// generously. The scheduler runs cycles SEQUENTIALLY per agent (it locks the row
// while a cycle runs and schedules the next from COMPLETION, not from claim), so a
// slow call no longer overlaps the next cadence; it just delays it. That lets the
// cap be long enough for a large model (e.g. a 70B on a busy free key) to finish
// and ACT, instead of being killed mid-thought and counted as a failure. On a real
// timeout the call still aborts -> a model failure -> retried next cadence (and the
// disable threshold is now far more tolerant of the odd flaky cycle).
// 5 minutes. Sequential scheduling (the scheduler RUN-LOCKS an agent while a cycle
// runs and reschedules the NEXT from completion) means a slow call never overlaps
// the next cadence — it just delays it. So a generous timeout lets a busy free 70B
// finish and ACT instead of being killed mid-thought and counted as a failure
// (the recurring Leo/70B timeout). A real hang still aborts -> retried next cadence.
// MUST stay below the scheduler's RUN_LOCK_SECONDS and HEARTBEAT_STALE_MS.
const DEFAULT_TIMEOUT_MS = 300_000;

// Per-route request quirks (reasoning toggles, token param, temperature) live
// in the capability table — providerCapabilities.ts is the single source; this
// module only assembles and sends.

// fetch with a hard timeout via AbortController. A custom fetchFn (tests) that
// ignores `signal` still works — the timer just never fires for it.
async function fetchWithTimeout(
  fetchFn: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchFn(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function callError(err: unknown, timeoutMs: number): string {
  if (err instanceof Error && err.name === "AbortError") {
    return `model call timed out after ${timeoutMs}ms`;
  }
  return err instanceof Error ? err.message : String(err);
}

// Parse a Retry-After header (delta-seconds or HTTP-date) into ms, capped at
// one hour — a provider asking for more is treated as "an hour, then re-probe".
const RETRY_AFTER_CAP_MS = 3_600_000;
function retryAfterMs(res: Response): number | undefined {
  const raw = res.headers.get("retry-after");
  if (!raw) return undefined;
  const secs = Number(raw);
  if (Number.isFinite(secs) && secs >= 0) {
    return Math.min(Math.round(secs * 1000), RETRY_AFTER_CAP_MS);
  }
  const at = Date.parse(raw);
  if (!Number.isFinite(at)) return undefined;
  const ms = at - Date.now();
  return ms > 0 ? Math.min(ms, RETRY_AFTER_CAP_MS) : 0;
}

function envKey(provider: ProviderName, env: ProviderEnv): string | undefined {
  switch (provider) {
    case "anthropic":
      return env.ANTHROPIC_API_KEY;
    case "openai":
      return env.OPENAI_API_KEY;
    case "groq":
      return env.GROQ_API_KEY;
    case "nvidia":
      return env.NVIDIA_API_KEY ?? env.MODEL_API_KEY;
    case "gemini":
      return env.GEMINI_API_KEY ?? env.MODEL_API_KEY;
    case "openai-compatible":
      return env.MODEL_API_KEY ?? env.OPENAI_API_KEY;
    case "mechanical":
      return undefined; // no LLM, no key — selectProvider short-circuits before this matters
  }
}

function baseUrlFor(provider: ProviderName, configured?: string): string {
  switch (provider) {
    case "openai":
      return "https://api.openai.com/v1";
    case "groq":
      return "https://api.groq.com/openai/v1";
    case "nvidia":
      return NVIDIA_BASE_URL;
    case "gemini":
      return GEMINI_BASE_URL;
    case "openai-compatible":
      return (configured ?? "").replace(/\/+$/, "");
    case "anthropic":
      return "https://api.anthropic.com/v1";
    case "mechanical":
      return ""; // never used — mechanical agents make no HTTP call
  }
}

// Non-LLM stub for the mechanical BENCHMARK agents. It satisfies the Provider
// contract so the deps stay non-null, but decide() is NEVER invoked: runCycle
// detects a mechanical agent and computes the decision deterministically before
// the provider is asked. If it is ever called, it fails closed (loudly) rather
// than silently pretending to reason.
class MechanicalProvider implements Provider {
  label: string;
  constructor(strategy: string) {
    this.label = `mechanical/${strategy}`;
  }
  async decide(): Promise<DecideResult> {
    return {
      ok: false,
      error:
        "mechanical benchmark provider has no model — runCycle must short-circuit before decide() (this call is a bug)",
    };
  }
}

class AnthropicProvider implements Provider {
  label: string;
  constructor(
    private model: string,
    private apiKey: string,
    private fetchFn: typeof fetch,
  ) {
    this.label = `anthropic/${model}`;
  }
  async decide(input: DecideInput): Promise<DecideResult> {
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    try {
      const res = await fetchWithTimeout(
        this.fetchFn,
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "x-api-key": this.apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            max_tokens: input.maxTokens ?? 1024,
            system: input.system,
            messages: [{ role: "user", content: input.user }],
          }),
        },
        timeoutMs,
      );
      if (!res.ok)
        return {
          ok: false,
          // Cap the upstream body: it lands in agent_cycles.skip_reason, so an
          // unbounded provider error page must not bloat the ledger row.
          error: `anthropic HTTP ${res.status}: ${(await res.text()).slice(0, 2000)}`,
          status: res.status,
          retryAfterMs: retryAfterMs(res),
        };
      const json = (await res.json()) as {
        content?: Array<{ text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const text = json.content?.map((c) => c.text ?? "").join("") ?? "";
      const usage = json.usage
        ? {
            promptTokens: json.usage.input_tokens ?? 0,
            completionTokens: json.usage.output_tokens ?? 0,
          }
        : undefined;
      return text
        ? { ok: true, text, usage }
        : { ok: false, error: "anthropic returned empty content" };
    } catch (err) {
      return { ok: false, error: callError(err, timeoutMs) };
    }
  }
}

class OpenAiCompatProvider implements Provider {
  label: string;
  constructor(
    private provider: ProviderName,
    private model: string,
    private apiKey: string,
    private baseUrl: string,
    private fetchFn: typeof fetch,
  ) {
    this.label = `${baseUrl}/${model}`;
  }
  async decide(input: DecideInput): Promise<DecideResult> {
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const shape = chatShapeFor(this.provider, this.model, this.baseUrl);
    try {
      const res = await fetchWithTimeout(
        this.fetchFn,
        `${this.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(
            buildChatBody(shape, {
              model: this.model,
              system: input.system,
              user: input.user,
              maxTokens: input.maxTokens ?? 1024,
            }),
          ),
        },
        timeoutMs,
      );
      if (!res.ok)
        return {
          ok: false,
          // Cap the upstream body: it lands in agent_cycles.skip_reason, so an
          // unbounded provider error page must not bloat the ledger row.
          error: `provider HTTP ${res.status}: ${(await res.text()).slice(0, 2000)}`,
          status: res.status,
          retryAfterMs: retryAfterMs(res),
        };
      const json = (await res.json()) as {
        choices?: Array<{
          message?: {
            content?: string | null;
            tool_calls?: Array<{
              function?: { name?: string; arguments?: string };
            }>;
          };
        }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const message = json.choices?.[0]?.message;
      const decisionArguments = message?.tool_calls?.find(
        (call) => call.function?.name === DECISION_TOOL_NAME,
      )?.function?.arguments;
      const text = decisionArguments ?? message?.content ?? "";
      const usage = json.usage
        ? {
            promptTokens: json.usage.prompt_tokens ?? 0,
            completionTokens: json.usage.completion_tokens ?? 0,
          }
        : undefined;
      return text
        ? { ok: true, text, usage }
        : { ok: false, error: "provider returned empty content" };
    } catch (err) {
      return { ok: false, error: callError(err, timeoutMs) };
    }
  }
}

// Build the provider from the spec's model block + env key. Throws a clear
// error if no model is configured (self-host requires one) or the env key is
// missing. fetch is injectable for tests.
export function selectProvider(
  spec: AgentSpec,
  env: ProviderEnv,
  fetchFn: typeof fetch = fetch,
): Provider {
  if (!spec.model) {
    throw new Error(
      "no model configured: set model.provider + model.name in the agent (self-host needs an explicit model)",
    );
  }
  const { provider, name, baseUrl } = spec.model;
  // Mechanical benchmark agents need NO model key: they never call a model. Return
  // the stub before the env-key requirement so a benchmark can be constructed with
  // no ANTHROPIC/NVIDIA/etc. key present.
  if (provider === "mechanical") return new MechanicalProvider(name);
  const key = envKey(provider, env);
  if (!key) {
    const varName =
      provider === "anthropic"
        ? "ANTHROPIC_API_KEY"
        : provider === "groq"
          ? "GROQ_API_KEY"
          : provider === "nvidia"
            ? "NVIDIA_API_KEY"
            : provider === "gemini"
              ? "GEMINI_API_KEY"
              : "OPENAI_API_KEY / MODEL_API_KEY";
    throw new Error(
      `missing model API key: set ${varName} in the environment (never in an agent file)`,
    );
  }
  if (provider === "anthropic")
    return new AnthropicProvider(name, key, fetchFn);
  const resolvedBase = baseUrlFor(provider, baseUrl);
  if (!resolvedBase) {
    throw new Error("openai-compatible provider needs model.baseUrl");
  }
  return new OpenAiCompatProvider(provider, name, key, resolvedBase, fetchFn);
}

// Build a provider for an EXPLICIT route + raw key (no spec, no env) — the
// decision probe's entry point. Same classes as selectProvider, so a probe
// exercises byte-identical request shapes to a real cycle.
export function providerForRoute(
  route: {
    provider: ProviderName;
    model: string;
    baseUrl?: string | null;
  },
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Provider {
  if (route.provider === "mechanical")
    return new MechanicalProvider(route.model);
  if (route.provider === "anthropic")
    return new AnthropicProvider(route.model, apiKey, fetchFn);
  const resolvedBase = baseUrlFor(route.provider, route.baseUrl ?? undefined);
  if (!resolvedBase) {
    throw new Error("openai-compatible route needs a baseUrl");
  }
  return new OpenAiCompatProvider(
    route.provider,
    route.model,
    apiKey,
    resolvedBase,
    fetchFn,
  );
}
