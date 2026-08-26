// Representative decision probe (reliability slice A, contract frozen on
// Telegram 2026-08-26). An HTTP-200 chat ping is NOT proof a route can run an
// agent: the 62f3a12 incident had 200s all round while every cycle failed with
// "Unexpected token W" (think-chain in the JSON slot), and Codex's gpt-5-nano
// probe at 256 completion tokens returned EMPTY content with a length finish
// because reasoning consumed the budget. A route is eligible only when a real
// call comes back parseable through the REAL decision parser with a non-empty
// decision — using the exact request shape a cycle would send
// (providerForRoute -> the same provider classes as the runner).
//
// Uses: boot eligibility of fallback-chain targets (slice B), circuit
// half-open reopens, any future model migration (D18: probe before adopt).
// The key is used for the one call and never logged; provider error text is
// sanitized before it can reach any log or ledger row.
import { providerForRoute } from "./providers.js";
import { chatShapeFor } from "./providerCapabilities.js";
import { parseDecision } from "./decision.js";
import { ProviderName } from "./types.js";

export interface ProbeRoute {
  provider: ProviderName;
  model: string;
  baseUrl?: string | null;
  key: string;
}

export type ProbeDecisionResult =
  | { ok: true }
  | {
      // http  = transport/status failure (the provider said no)
      // empty = 2xx but no content (reasoning ate the budget, or a dead route)
      // parse = content that the decision parser rejects (contract mismatch)
      ok: false;
      stage: "http" | "empty" | "parse";
      error: string;
      // Structured metadata from the provider response (A2): lets the caller
      // classify 429/5xx and honor Retry-After without string sniffing.
      status?: number;
      retryAfterMs?: number;
    };

// A canned mini-observation whose ONLY correct answer is a tiny skip decision.
// Small enough to cost nothing, real enough to exercise the full JSON contract.
const PROBE_SYSTEM = [
  "You are a trading agent contract probe.",
  'Reply with EXACTLY one JSON object: {"decision":"skip","reason":"contract probe"}.',
  "No prose, no code fences, no additional keys.",
].join(" ");
const PROBE_USER =
  "Observation: BTC 24h change 0.0%. Confirm the decision contract.";

const PROBE_TIMEOUT_MS = 30_000;

/** Strip the key (and bearer echoes) out of any text a probe might surface. */
function sanitize(text: string, key: string): string {
  let out = (text ?? "").slice(0, 400);
  if (key) out = out.split(key).join("***");
  out = out.replace(/Bearer\s+[A-Za-z0-9._-]{8,}/g, "Bearer ***");
  return out.slice(0, 200);
}

export async function probeDecisionContract(
  route: ProbeRoute,
  fetchFn: typeof fetch = fetch,
): Promise<ProbeDecisionResult> {
  const shape = chatShapeFor(
    route.provider,
    route.model,
    route.baseUrl ?? undefined,
  );
  const provider = providerForRoute(route, route.key, fetchFn);
  const res = await provider.decide({
    system: PROBE_SYSTEM,
    user: PROBE_USER,
    // Reasoning models spend hidden tokens first — grant at least the family
    // floor (1024) or the empty-with-length-finish false negative comes back.
    maxTokens: Math.max(1024, shape.minProbeCompletionTokens),
    timeoutMs: PROBE_TIMEOUT_MS,
  });
  if (!res.ok) {
    const error = sanitize(res.error, route.key);
    // Provider classes report empty 2xx content as "... returned empty content".
    const stage = /returned empty content/i.test(res.error) ? "empty" : "http";
    return {
      ok: false,
      stage,
      error,
      status: res.status,
      retryAfterMs: res.retryAfterMs,
    };
  }
  if (!res.text.trim()) {
    return { ok: false, stage: "empty", error: "empty completion" };
  }
  const parsed = parseDecision(res.text);
  if (!parsed.ok) {
    return { ok: false, stage: "parse", error: sanitize(parsed.error, route.key) };
  }
  return { ok: true };
}
