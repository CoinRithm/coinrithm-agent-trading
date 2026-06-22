// BYO-model provider layer. The user's model API key comes from the ENV ONLY,
// never from an agent file. One call returns one chunk of text that must be a
// single structured-JSON decision (parsed in decision.ts). No free-form tool
// execution — the model only proposes; the runner disposes.

import { AgentSpec, ProviderName } from "./types.js";

export interface DecideInput {
  system: string;
  user: string;
  maxTokens?: number;
  // Abort the model call after this many ms so a slow/hung provider can never
  // bleed past the agent's cadence. Default DEFAULT_TIMEOUT_MS.
  timeoutMs?: number;
}

export type DecideResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export interface Provider {
  label: string;
  decide(input: DecideInput): Promise<DecideResult>;
}

export interface ProviderEnv {
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GROQ_API_KEY?: string;
  NVIDIA_API_KEY?: string;
  MODEL_API_KEY?: string;
}

// NVIDIA NIM is OpenAI-compatible; the `nvidia` preset hard-wires the hosted
// endpoint so an agent only needs `{ provider: nvidia, name: "<model id>" }`.
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

// Cap any single model call. Our measured NIM latencies are a few seconds, but a
// shared free key occasionally queues/hangs; without a cap one slow call would
// run past the next cadence and bleed cycles together. On timeout the call aborts
// -> the runner records a model failure -> it simply retries next cadence.
const DEFAULT_TIMEOUT_MS = 30_000;

// Reasoning models (NVIDIA Nemotron) DEFAULT to emitting a long <think> chain:
// measured ~30-60s/call and a JSON-leak risk. The documented toggle is a
// "detailed thinking off" line in the system prompt, which drops them to
// instruct mode (measured ~3-4s, clean JSON). Apply it automatically for any
// nemotron model so a per-cadence decision never blows the cadence.
function applyReasoningToggle(model: string, system: string): string {
  return /nemotron/i.test(model) ? `detailed thinking off\n\n${system}` : system;
}

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
    case "openai-compatible":
      return env.MODEL_API_KEY ?? env.OPENAI_API_KEY;
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
    case "openai-compatible":
      return (configured ?? "").replace(/\/+$/, "");
    case "anthropic":
      return "https://api.anthropic.com/v1";
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
      if (!res.ok) return { ok: false, error: `anthropic HTTP ${res.status}: ${await res.text()}` };
      const json = (await res.json()) as { content?: Array<{ text?: string }> };
      const text = json.content?.map((c) => c.text ?? "").join("") ?? "";
      return text ? { ok: true, text } : { ok: false, error: "anthropic returned empty content" };
    } catch (err) {
      return { ok: false, error: callError(err, timeoutMs) };
    }
  }
}

class OpenAiCompatProvider implements Provider {
  label: string;
  constructor(
    private model: string,
    private apiKey: string,
    private baseUrl: string,
    private fetchFn: typeof fetch,
  ) {
    this.label = `${baseUrl}/${model}`;
  }
  async decide(input: DecideInput): Promise<DecideResult> {
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
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
          body: JSON.stringify({
            model: this.model,
            temperature: 0.2,
            max_tokens: input.maxTokens ?? 1024,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: applyReasoningToggle(this.model, input.system) },
              { role: "user", content: input.user },
            ],
          }),
        },
        timeoutMs,
      );
      if (!res.ok) return { ok: false, error: `provider HTTP ${res.status}: ${await res.text()}` };
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = json.choices?.[0]?.message?.content ?? "";
      return text ? { ok: true, text } : { ok: false, error: "provider returned empty content" };
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
  const key = envKey(provider, env);
  if (!key) {
    const varName =
      provider === "anthropic"
        ? "ANTHROPIC_API_KEY"
        : provider === "groq"
          ? "GROQ_API_KEY"
          : provider === "nvidia"
            ? "NVIDIA_API_KEY"
            : "OPENAI_API_KEY / MODEL_API_KEY";
    throw new Error(`missing model API key: set ${varName} in the environment (never in an agent file)`);
  }
  if (provider === "anthropic") return new AnthropicProvider(name, key, fetchFn);
  const resolvedBase = baseUrlFor(provider, baseUrl);
  if (!resolvedBase) {
    throw new Error("openai-compatible provider needs model.baseUrl");
  }
  return new OpenAiCompatProvider(name, key, resolvedBase, fetchFn);
}
