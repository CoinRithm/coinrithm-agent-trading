// HTTP-only, bounded completion diagnostics. Never import this from stdio.
// A finished response is server-side delivery, not client acknowledgement/use.
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type {
  JSONRPCMessage,
  RequestId,
} from "@modelcontextprotocol/sdk/types.js";
import { bearerFromHeader, log } from "./client.js";
import { SERVER_VERSION } from "./version.js";

// Explicit, server-owned dimensions; tests compare this with actual tools/list.
// Never retain a caller's unknown tool name, even truncated or hashed.
export const COMPLETION_TOOL_NAMES = [
  "whoami",
  "get_portfolio",
  "get_wallet",
  "list_open_orders",
  "get_positions",
  "resolve_symbol",
  "get_equity_curve",
  "get_my_trades",
  "get_market_context",
  "get_candles",
  "discover_pm_markets",
  "get_performance",
  "get_agent_ledger",
  "export_agent_ledger",
  "export_run_evidence",
  "get_arena_leaderboard",
  "get_arena_agent",
  "futures_quote",
  "pm_quote",
  "spot_quote",
  "place_spot_order",
  "cancel_spot_order",
  "open_futures_position",
  "set_futures_sl_tp",
  "close_futures_position",
  "open_pm_position",
  "report_pm_opportunity",
  "pm_data_overview",
  "pm_data_sources",
  "pm_data_sources_health",
  "pm_data_events",
  "pm_data_event",
  "pm_data_whales",
  "pm_data_whale_wallets",
  "pm_data_whale_wallet",
  "pm_data_disagreements",
  "pm_data_calibration",
  "pm_data_canonical",
  "pm_data_volume_history",
  "get_crypto_movers",
] as const;
const toolNames: ReadonlySet<string> = new Set(COMPLETION_TOOL_NAMES);

type Operation =
  | "initialize"
  | "tools_list"
  | "tools_call"
  | "notification"
  | "other"
  | "invalid";
type Outcome =
  "result" | "tool_error" | "protocol_error" | "no_response" | "not_applicable";
type ToolName = (typeof COMPLETION_TOOL_NAMES)[number] | "unknown" | null;
type RpcCompletion = {
  operation: Operation;
  tool: ToolName;
  rpc_outcome: Outcome;
  result_http_status: number | null;
  result_ok: boolean | null;
};
export type HttpCompletionRecord = Readonly<
  RpcCompletion & {
    event: "mcp_completion";
    schema_version: 1;
    completed_at: string;
    duration_ms: number;
    service_version: string;
    transport: "streamable_http";
    credential_supplied: boolean;
    http_status: number | null;
    delivery: "finished" | "aborted";
  }
>;
export type CompletionLogger = (line: string) => void;

const object = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
const status = (value: unknown): number | null =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  (value === 0 || (value >= 100 && value <= 599))
    ? value
    : null;
const empty = (
  operation: Operation = "invalid",
  tool: ToolName = null,
): RpcCompletion => ({
  operation,
  tool,
  rpc_outcome: "no_response",
  result_http_status: null,
  result_ok: null,
});

/** Attach before JSON parsing; malformed/rejected HTTP requests remain invalid,
 * no_response, with their actual HTTP status. Do not read bodies or raw errors.
 * Authentication and caller origin are deliberately NOT inferred from headers.
 */
export function observeHttpCompletion(
  req: IncomingMessage,
  res: ServerResponse,
  logger: CompletionLogger = (line) => log(line),
): { attach: (transport: Transport) => void } {
  const started = performance.now();
  const credentialSupplied = Boolean(
    bearerFromHeader(req.headers.authorization) ??
    bearerFromHeader(req.headers["x-coinrithm-api-key"]),
  );
  const records: RpcCompletion[] = [];
  // IDs are transient correlations only, never copied into records/logs. Clear
  // on completion so a late tool callback cannot retain IDs or emit twice.
  const pending = new Map<RequestId, RpcCompletion[]>();
  let completed = false;
  let delivery: HttpCompletionRecord["delivery"] | undefined;
  let sendsInFlight = 0;

  const emit = () => {
    if (completed || !delivery || (delivery === "finished" && sendsInFlight))
      return;
    completed = true;
    res.off("finish", onFinish);
    res.off("close", onClose);
    res.off("error", onAbort);
    const elapsed = performance.now() - started;
    const duration = Number.isFinite(elapsed)
      ? Math.max(0, Math.round(elapsed * 1000) / 1000)
      : 0;
    const completedAt = new Date().toISOString();
    // A pre-header disconnect has no HTTP status; Node's default 200 is not one.
    const httpStatus = res.headersSent ? status(res.statusCode) : null;
    const snapshots = records.length ? records : [empty()];
    for (const rpc of snapshots) {
      const record: HttpCompletionRecord = {
        event: "mcp_completion",
        schema_version: 1,
        completed_at: completedAt,
        duration_ms: duration,
        service_version: SERVER_VERSION,
        transport: "streamable_http",
        ...rpc,
        credential_supplied: credentialSupplied,
        http_status: httpStatus,
        delivery,
      };
      try {
        logger(JSON.stringify(record));
      } catch {
        // Observability must never change a tool response or recurse into logging.
      }
    }
    records.length = 0;
    pending.clear();
  };
  const onFinish = () => {
    delivery = "finished";
    emit();
  };
  const onAbort = () => {
    delivery = "aborted";
    // A computed response in an interrupted stream is not confirmed delivered.
    // In particular, a still-pending send may reject after this close event.
    for (const rpc of records) {
      if (rpc.rpc_outcome !== "not_applicable") {
        rpc.rpc_outcome = "no_response";
        rpc.result_http_status = null;
        rpc.result_ok = null;
      }
    }
    emit();
  };
  const onClose = () => {
    if (!res.writableFinished) onAbort();
    else onFinish();
  };
  res.once("finish", onFinish);
  res.once("close", onClose);
  res.once("error", onAbort);

  const incoming = (message: JSONRPCMessage) => {
    if (completed) return;
    if (!("method" in message)) {
      records.push({ ...empty("other"), rpc_outcome: "not_applicable" });
      return;
    }
    if (!("id" in message)) {
      records.push({ ...empty("notification"), rpc_outcome: "not_applicable" });
      return;
    }
    const operation: Operation =
      message.method === "initialize"
        ? "initialize"
        : message.method === "tools/list"
          ? "tools_list"
          : message.method === "tools/call"
            ? "tools_call"
            : "other";
    const name =
      operation === "tools_call" ? object(message.params)?.name : undefined;
    const tool =
      operation !== "tools_call"
        ? null
        : typeof name === "string" && toolNames.has(name)
          ? (name as ToolName)
          : "unknown";
    const rpc = empty(operation, tool);
    records.push(rpc);
    pending.set(message.id, [...(pending.get(message.id) ?? []), rpc]);
  };

  return {
    attach(transport) {
      // Call AFTER server.connect (which installs SDK callbacks), before handling
      // this request. Observe only SDK-accepted messages, not unvalidated bodies.
      const onmessage = transport.onmessage;
      transport.onmessage = (message, extra) => {
        incoming(message);
        onmessage?.(message, extra);
      };
      const send = transport.send.bind(transport);
      transport.send = async (message, options) => {
        const matches =
          "id" in message ? pending.get(message.id as RequestId) : undefined;
        // Duplicate IDs are ambiguous; never attribute one response twice.
        const rpc =
          !completed && matches?.length === 1 ? matches[0] : undefined;
        if (!rpc || (!("result" in message) && !("error" in message))) {
          return send(message, options);
        }
        // This is the SDK's FINAL result, after input/output schema validation.
        rpc.result_http_status = null;
        rpc.result_ok = null;
        if ("error" in message) rpc.rpc_outcome = "protocol_error";
        else {
          const result = object(message.result);
          const structured = object(result?.structuredContent);
          rpc.rpc_outcome =
            rpc.operation === "tools_call" && result?.isError === true
              ? "tool_error"
              : "result";
          if (rpc.operation === "tools_call") {
            rpc.result_http_status = status(structured?.httpStatus);
            rpc.result_ok =
              typeof structured?.ok === "boolean" ? structured.ok : null;
          }
        }
        sendsInFlight += 1;
        try {
          return await send(message, options);
        } catch (error) {
          rpc.rpc_outcome = "no_response";
          rpc.result_http_status = null;
          rpc.result_ok = null;
          throw error;
        } finally {
          sendsInFlight -= 1;
          emit();
        }
      };
    },
  };
}
