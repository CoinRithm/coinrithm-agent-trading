// Provider request-capability adapter (reliability slice A, contract frozen on
// Telegram 2026-08-26). One declarative table answers "what request shape does
// this route accept?" so the runner call builder, the decision probe, and any
// future router all read ONE source instead of re-learning each provider's
// quirks by failing in production:
//
//   - OpenAI's current models (gpt-5*, o*) REJECT `max_tokens` and any
//     non-default `temperature` (live-probed 2026-08-26 on gpt-5-nano); they
//     take `max_completion_tokens`. This applies by MODEL family, not just the
//     `openai` provider: an openai-compatible gateway serving gpt-5 needs the
//     same shape, which is why "generic OpenAI-compatible" is unsafe.
//   - NVIDIA-hosted Nemotron models default to a long think-chain that both
//     pollutes the JSON decision and burns the completion budget; they need
//     `chat_template_kwargs.enable_thinking=false` (NVIDIA endpoint only) plus
//     the "detailed thinking off" system hint (any endpoint) — the 62f3a12
//     incident fix, now encoded as data.
//   - Reasoning models spend hidden tokens BEFORE emitting content: a probe
//     with a small allowance returns empty-with-length-finish and looks broken
//     when the route is fine. `minProbeCompletionTokens` is the floor a
//     REPRESENTATIVE probe must grant (1024 parsed where 256 came back empty).
import { ProviderName } from "./types.js";
import { DECISION_JSON_SCHEMA } from "./decision.js";

export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const DECISION_TOOL_NAME = "submit_trading_decision";

export interface ChatShape {
  family:
    "openai-reasoning" | "nvidia-nemotron" | "anthropic" | "openai-compat";
  // Which body parameter carries the completion budget.
  tokenParam: "max_tokens" | "max_completion_tokens";
  // Whether a non-default temperature may be sent.
  allowsTemperature: boolean;
  // Whether `response_format: {type:"json_object"}` may be sent.
  jsonResponseFormat: boolean;
  // Providers that support schema-guided decoding get the actual decision
  // contract, not merely "some JSON". Plain json_object allowed Nano to return
  // decision=act with actions=[] for hundreds of cycles.
  jsonSchema?: Record<string, unknown>;
  jsonSchemaTransport?: "tool_call" | "response_format";
  // Extra top-level body fields (e.g. NVIDIA's chat_template_kwargs).
  extraBody?: Record<string, unknown>;
  // Prefix line for the system prompt (e.g. "detailed thinking off").
  systemHint?: string;
  // Minimum completion allowance a representative decision probe must grant.
  minProbeCompletionTokens: number;
}

// gpt-5*, o1/o3/o4* — the OpenAI reasoning-API family, wherever it is served.
const OPENAI_REASONING_MODEL = /^(gpt-5|o[0-9])/i;
const NEMOTRON_MODEL = /nemotron/i;

export function chatShapeFor(
  provider: ProviderName,
  model: string,
  baseUrl?: string,
): ChatShape {
  if (provider === "anthropic") {
    return {
      family: "anthropic",
      tokenParam: "max_tokens",
      allowsTemperature: true,
      jsonResponseFormat: false,
      minProbeCompletionTokens: 1024,
    };
  }
  if (provider === "openai" || OPENAI_REASONING_MODEL.test(model)) {
    return {
      family: "openai-reasoning",
      tokenParam: "max_completion_tokens",
      allowsTemperature: false,
      jsonResponseFormat: true,
      minProbeCompletionTokens: 1024,
    };
  }
  if (NEMOTRON_MODEL.test(model)) {
    const isNvidiaEndpoint = baseUrl === NVIDIA_BASE_URL;
    return {
      family: "nvidia-nemotron",
      tokenParam: "max_tokens",
      allowsTemperature: true,
      jsonResponseFormat: true,
      jsonSchema: isNvidiaEndpoint
        ? (DECISION_JSON_SCHEMA as unknown as Record<string, unknown>)
        : undefined,
      // integrate.api.nvidia.com currently ignores both response_format
      // json_schema and guided_json for these hosted models. Its forced tool
      // call path is the live-probed contract-enforcing transport.
      jsonSchemaTransport: isNvidiaEndpoint ? "tool_call" : undefined,
      // The kwargs switch is only honored (and only safe to send) on the NVIDIA
      // endpoint; the system hint helps on any endpoint serving a Nemotron.
      extraBody: isNvidiaEndpoint
        ? { chat_template_kwargs: { enable_thinking: false } }
        : undefined,
      systemHint: "detailed thinking off",
      minProbeCompletionTokens: 1024,
    };
  }
  return {
    family: "openai-compat",
    tokenParam: "max_tokens",
    allowsTemperature: true,
    jsonResponseFormat: true,
    minProbeCompletionTokens: 1024,
  };
}

/** Build the chat-completions body for a route from its capability shape. */
export function buildChatBody(
  shape: ChatShape,
  args: {
    model: string;
    system: string;
    user: string;
    maxTokens: number;
    temperature?: number;
  },
): Record<string, unknown> {
  const system = shape.systemHint
    ? `${shape.systemHint}\n\n${args.system}`
    : args.system;
  return {
    model: args.model,
    ...(shape.allowsTemperature
      ? { temperature: args.temperature ?? 0.2 }
      : {}),
    [shape.tokenParam]: args.maxTokens,
    ...(shape.jsonSchema && shape.jsonSchemaTransport === "tool_call"
      ? {
          tools: [
            {
              type: "function",
              function: {
                name: DECISION_TOOL_NAME,
                description:
                  "Submit the complete CoinRithm paper-trading decision for this cycle.",
                parameters: shape.jsonSchema,
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: DECISION_TOOL_NAME },
          },
        }
      : {}),
    ...(shape.jsonResponseFormat && shape.jsonSchemaTransport !== "tool_call"
      ? {
          response_format: shape.jsonSchema
            ? {
                type: "json_schema",
                json_schema: {
                  name: "coinrithm_trading_decision",
                  schema: shape.jsonSchema,
                },
              }
            : { type: "json_object" },
        }
      : {}),
    ...(shape.extraBody ?? {}),
    messages: [
      { role: "system", content: system },
      { role: "user", content: args.user },
    ],
  };
}
