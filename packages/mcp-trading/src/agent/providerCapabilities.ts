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

// A retry changes transport only after the strict parser has rejected a known
// Super tool-argument encoding failure. Valid responses and other routes keep
// their original request shape. A custom endpoint is deliberately excluded.
export function canRetrySuperToolOutput(
  route: { provider: string; model: string; baseUrl?: string | null },
  responseSource: string | undefined,
  actionsStringDiagnostic: string | undefined,
): boolean {
  return (
    route.provider === "nvidia" &&
    route.model === "nvidia/nemotron-3-super-120b-a12b" &&
    (route.baseUrl == null || route.baseUrl === NVIDIA_BASE_URL) &&
    responseSource === "tool_call" &&
    actionsStringDiagnostic !== undefined
  );
}

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

// Opt-in alternative for a hosted Nemotron route: plain JSON content
// (`response_format: json_object`) instead of the forced decision tool call.
// Hosted Super has returned the forced tool call with `actions` as a string
// (519 of 533 malformed attempts in a 24h sample, 2026-10-05). In an 8-call
// synthetic smoke pilot the tool-call arms failed 0/4 with the same coarse
// string shape and the JSON-content arm parsed 2/2; that is not a rate
// measurement and the exact serialization cause is not established. Only the
// request transport changes: parseDecision still validates the full contract.
export function withJsonContentTransport(shape: ChatShape): ChatShape {
  if (shape.family !== "nvidia-nemotron") return shape;
  return { ...shape, jsonSchema: undefined, jsonSchemaTransport: undefined };
}

// Action variants a cycle may withhold from a schema-enforcing route. Only
// futures_open today: the runner withholds it when futures capacity is spent.
export type DecisionActionExclusion = "futures_open";

// Transport-only restriction: drop the excluded variants from the action oneOf
// a route decodes against. parseDecision keeps validating the FULL contract, so
// a route that does not enforce a schema can still propose the action and the
// validator rejects it. Never returns an empty oneOf.
export function restrictDecisionSchema(
  schema: Record<string, unknown>,
  exclude: readonly DecisionActionExclusion[] | undefined,
): Record<string, unknown> {
  if (!exclude?.length) return schema;
  const properties = schema.properties as Record<string, unknown> | undefined;
  const actions = properties?.actions as
    { items?: { oneOf?: unknown[] } } | undefined;
  const variants = actions?.items?.oneOf;
  if (!properties || !actions || !Array.isArray(variants)) return schema;
  const kept = variants.filter((variant) => {
    const type = (variant as { properties?: { type?: { const?: unknown } } })
      .properties?.type?.const;
    return !exclude.includes(type as DecisionActionExclusion);
  });
  if (kept.length === variants.length || kept.length === 0) return schema;
  return {
    ...schema,
    properties: {
      ...properties,
      actions: { ...actions, items: { ...actions.items, oneOf: kept } },
    },
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
    excludeActionTypes?: readonly DecisionActionExclusion[];
  },
): Record<string, unknown> {
  const system = shape.systemHint
    ? `${shape.systemHint}\n\n${args.system}`
    : args.system;
  const jsonSchema = shape.jsonSchema
    ? restrictDecisionSchema(shape.jsonSchema, args.excludeActionTypes)
    : undefined;
  return {
    model: args.model,
    ...(shape.allowsTemperature
      ? { temperature: args.temperature ?? 0.2 }
      : {}),
    [shape.tokenParam]: args.maxTokens,
    ...(jsonSchema && shape.jsonSchemaTransport === "tool_call"
      ? {
          tools: [
            {
              type: "function",
              function: {
                name: DECISION_TOOL_NAME,
                description:
                  "Submit the complete CoinRithm paper-trading decision for this cycle.",
                parameters: jsonSchema,
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
          response_format: jsonSchema
            ? {
                type: "json_schema",
                json_schema: {
                  name: "coinrithm_trading_decision",
                  schema: jsonSchema,
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
