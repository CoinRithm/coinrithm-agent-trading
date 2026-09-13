import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createServer,
  request,
  type Server,
  type RequestListener,
} from "node:http";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { z } from "zod";
import { CoinRithmClient } from "./client.js";
import { createHttpApp } from "./http.js";
import { registerTools } from "./tools.js";
import {
  COMPLETION_TOOL_NAMES,
  observeHttpCompletion,
  type HttpCompletionRecord,
} from "./httpCompletion.js";

const servers: Server[] = [];
const cleanups: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  vi.restoreAllMocks();
});
const deferred = <T = void>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
async function listen(handler: RequestListener) {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No localhost listener");
  return `http://127.0.0.1:${address.port}`;
}
async function fixture(
  options: {
    upstream?: RequestListener;
    createServer?: () => McpServer;
    logger?: (line: string) => void;
  } = {},
) {
  const lines: string[] = [];
  const upstreamCalls: Array<{ path: string; credential: boolean }> = [];
  const upstream = await listen((req, res) => {
    upstreamCalls.push({
      path: req.url ?? "",
      credential: Boolean(req.headers.authorization),
    });
    if (options.upstream) return options.upstream(req, res);
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({ sources: [], privateFixture: "DO_NOT_LOG_RESULT" }),
    );
  });
  const app = createHttpApp(new CoinRithmClient({ baseUrl: upstream }), {
    createServer: options.createServer,
    completionLogger: options.logger ?? ((line) => lines.push(line)),
  });
  // Retain Express's existing parser/error response, without its test-only stderr.
  app.set("env", "test");
  const base = await listen(app);
  return {
    base,
    lines,
    upstreamCalls,
    records: () =>
      lines.map((line) => JSON.parse(line) as HttpCompletionRecord),
  };
}
const call = (name = "pm_data_sources", args: unknown = {}) => ({
  jsonrpc: "2.0",
  id: "DO_NOT_LOG_RPC_ID",
  method: "tools/call",
  params: { name, arguments: args },
});
async function post(
  base: string,
  message: unknown,
  headers: Record<string, string> = {},
) {
  const response = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body: typeof message === "string" ? message : JSON.stringify(message),
    signal: AbortSignal.timeout(3000),
  });
  const text = await response.text();
  const messages =
    text.startsWith("{") || text.startsWith("[")
      ? [JSON.parse(text)]
      : text
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data: "))
          .map((line) => JSON.parse(line.slice(6)));
  return { response, messages, text };
}
const waitRecords = async (
  f: Awaited<ReturnType<typeof fixture>>,
  count: number,
) => {
  await vi.waitFor(() => expect(f.records()).toHaveLength(count));
  return f.records();
};

describe("HTTP completion metrics through the real localhost MCP SDK", () => {
  it("separates initialize/list/notification/call and matches the real registered allowlist", async () => {
    const f = await fixture();
    const client = new Client({
      name: "DO_NOT_LOG_CLIENT_INFO",
      version: "private-fixture",
    });
    const transport = new StreamableHTTPClientTransport(
      new URL(`${f.base}/mcp`),
    );
    cleanups.push(() => client.close());
    await client.connect(transport);
    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name).sort()).toEqual(
      [...COMPLETION_TOOL_NAMES].sort(),
    );
    const result = await client.callTool({
      name: "pm_data_sources",
      arguments: {},
    });
    expect(result.isError).toBe(false);
    const records = await waitRecords(f, 4);
    expect(records.map((record) => record.operation)).toEqual([
      "initialize",
      "notification",
      "tools_list",
      "tools_call",
    ]);
    expect(records[1]).toMatchObject({
      rpc_outcome: "not_applicable",
      http_status: 202,
      tool: null,
    });
    expect(records[3]).toMatchObject({
      tool: "pm_data_sources",
      rpc_outcome: "result",
      result_http_status: 200,
      result_ok: true,
      delivery: "finished",
      credential_supplied: false,
    });
    expect(f.lines.join("")).not.toContain("DO_NOT_LOG");
  });

  it.each([undefined, "Bearer DO_NOT_LOG_BOGUS_KEY"])(
    "keeps public success keyless with header %s",
    async (authorization) => {
      const f = await fixture();
      const { messages } = await post(
        f.base,
        call(),
        authorization ? { Authorization: authorization } : {},
      );
      const [record] = await waitRecords(f, 1);
      expect(messages[0].result.structuredContent.httpStatus).toBe(200);
      expect(record).toMatchObject({
        credential_supplied: Boolean(authorization),
        result_ok: true,
        result_http_status: 200,
        rpc_outcome: "result",
      });
      expect(record).not.toHaveProperty("auth_verdict");
      expect(record).not.toHaveProperty("access_path");
      expect(f.upstreamCalls).toEqual([
        { path: "/api/prediction-markets/sources", credential: false },
      ]);
      expect(f.lines.join("")).not.toContain("DO_NOT_LOG");
    },
  );

  it.each(["whoami", "get_arena_leaderboard"])(
    "records missing-key %s as tool failure, not HTTP success",
    async (name) => {
      const f = await fixture();
      const { response, messages } = await post(f.base, call(name));
      expect(response.status).toBe(200);
      expect(messages[0].result.isError).toBe(true);
      expect((await waitRecords(f, 1))[0]).toMatchObject({
        tool: name,
        rpc_outcome: "tool_error",
        http_status: 200,
        result_http_status: 401,
        result_ok: false,
        credential_supplied: false,
      });
      expect(f.upstreamCalls).toHaveLength(0);
    },
  );

  it.each([200, 401, 429, 503])(
    "preserves protected result status %i without claiming authentication",
    async (upstreamStatus) => {
      const f = await fixture({
        upstream: (_req, res) => {
          res.writeHead(upstreamStatus, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ private: "DO_NOT_LOG_UPSTREAM_BODY" }));
        },
      });
      await post(
        f.base,
        call("whoami", {
          agentTrace: {
            runId: "DO_NOT_LOG_RUN",
            rationaleSummary: "DO_NOT_LOG_PROMPT",
          },
        }),
        {
          "X-CoinRithm-API-Key": "DO_NOT_LOG_KEY",
          "User-Agent": "DO_NOT_LOG_UA",
          "X-Forwarded-For": "192.0.2.10",
        },
      );
      const [record] = await waitRecords(f, 1);
      expect(record).toMatchObject({
        credential_supplied: true,
        result_http_status: upstreamStatus,
        result_ok: upstreamStatus === 200,
        rpc_outcome: upstreamStatus === 200 ? "result" : "tool_error",
      });
      expect(Object.keys(record).sort()).toEqual(
        [
          "event",
          "schema_version",
          "completed_at",
          "duration_ms",
          "service_version",
          "transport",
          "operation",
          "tool",
          "rpc_outcome",
          "result_http_status",
          "result_ok",
          "credential_supplied",
          "http_status",
          "delivery",
        ].sort(),
      );
      expect(f.lines.join("")).not.toMatch(
        /DO_NOT_LOG|192\.0\.2\.10|user_agent|origin|authenticated/,
      );
    },
  );

  it("does not call a public Arena 200 authenticated even with a supplied key", async () => {
    const f = await fixture();
    await post(f.base, call("get_arena_leaderboard"), {
      Authorization: "Bearer DO_NOT_LOG_KEY",
    });
    const [record] = await waitRecords(f, 1);
    expect(f.upstreamCalls[0].path).toBe("/api/arena");
    expect(record).toMatchObject({
      tool: "get_arena_leaderboard",
      credential_supplied: true,
      result_ok: true,
    });
    expect(record).not.toHaveProperty("auth_verdict");
  });

  it("captures status0 network failure without retaining the raw error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const f = await fixture({ upstream: (req) => req.socket.destroy() });
    const { messages } = await post(f.base, call());
    expect(messages[0].result.structuredContent.httpStatus).toBe(0);
    expect((await waitRecords(f, 1))[0]).toMatchObject({
      rpc_outcome: "tool_error",
      result_http_status: 0,
      result_ok: false,
    });
    expect(f.lines.join("")).not.toMatch(/fetch failed|socket|DO_NOT_LOG/);
  });

  it("normalizes unknown names and observes SDK input/output validation, not callback success", async () => {
    const callback = vi.fn(() => ({
      content: [],
      structuredContent: {
        httpStatus: 200,
        ok: true,
        required: "INVALID_DO_NOT_LOG",
      },
    }));
    const f = await fixture({
      createServer: () => {
        const server = new McpServer({ name: "fixture", version: "0" });
        server.registerTool(
          "pm_data_sources",
          {
            inputSchema: { required: z.number() },
            outputSchema: {
              httpStatus: z.number(),
              ok: z.boolean(),
              required: z.number(),
            },
          },
          callback,
        );
        return server;
      },
    });
    const unknown = await post(
      f.base,
      call(`DO_NOT_LOG_UNKNOWN_${"x".repeat(500)}`),
    );
    const input = await post(
      f.base,
      call("pm_data_sources", { required: "DO_NOT_LOG_BAD_INPUT" }),
    );
    const output = await post(f.base, call("pm_data_sources", { required: 1 }));
    for (const result of [unknown, input, output])
      expect(result.messages[0].result.isError).toBe(true);
    expect(callback).toHaveBeenCalledTimes(1);
    const records = await waitRecords(f, 3);
    expect(records.map((record) => record.tool)).toEqual([
      "unknown",
      "pm_data_sources",
      "pm_data_sources",
    ]);
    for (const record of records)
      expect(record).toMatchObject({
        rpc_outcome: "tool_error",
        result_ok: null,
        result_http_status: null,
        http_status: 200,
      });
    expect(f.lines.join("")).not.toContain("DO_NOT_LOG");
  });

  it("separates protocol errors and malformed/rejected HTTP from accepted notifications", async () => {
    const f = await fixture();
    await post(f.base, {
      jsonrpc: "2.0",
      id: "DO_NOT_LOG",
      method: "DO_NOT_LOG_METHOD",
    });
    // Parser failures return the unchanged Express HTML error response.
    const malformed = await fetch(`${f.base}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"DO_NOT_LOG":',
      signal: AbortSignal.timeout(3000),
    });
    expect(malformed.status).toBe(400);
    await malformed.text();
    const rejected = await post(f.base, call(), { Accept: "application/json" });
    expect(rejected.response.status).toBe(406);
    await post(f.base, { jsonrpc: "2.0", method: "notifications/initialized" });
    const records = await waitRecords(f, 4);
    expect(records[0]).toMatchObject({
      operation: "other",
      rpc_outcome: "protocol_error",
    });
    expect(records[1]).toMatchObject({
      operation: "invalid",
      rpc_outcome: "no_response",
      http_status: 400,
    });
    expect(records[2]).toMatchObject({
      operation: "invalid",
      rpc_outcome: "no_response",
      http_status: 406,
    });
    expect(records[3]).toMatchObject({
      operation: "notification",
      rpc_outcome: "not_applicable",
      http_status: 202,
    });
    expect(f.upstreamCalls).toHaveLength(0);
    expect(f.lines.join("")).not.toContain("DO_NOT_LOG");
  });

  it("captures early disconnect once, without reporting a late tool success", async () => {
    const entered = deferred();
    const release = deferred();
    cleanups.push(() => release.resolve());
    const f = await fixture({
      upstream: async (_req, res) => {
        entered.resolve();
        await release.promise;
        res.setHeader("Content-Type", "application/json");
        res.end('{"sources":[]}');
      },
    });
    const req = request(`${f.base}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
    });
    req.on("error", () => {});
    req.end(JSON.stringify(call()));
    await entered.promise;
    req.destroy();
    const [record] = await waitRecords(f, 1);
    expect(record).toMatchObject({
      operation: "tools_call",
      rpc_outcome: "no_response",
      delivery: "aborted",
      result_ok: null,
      result_http_status: null,
    });
    release.resolve();
    await new Promise((resolve) => setImmediate(resolve));
    expect(f.records()).toHaveLength(1);
  });

  it("handles a batch once per accepted RPC and ignores outbound non-results", async () => {
    const f = await fixture();
    const result = await post(f.base, [
      call(),
      { jsonrpc: "2.0", id: 2, method: "ping" },
      { jsonrpc: "2.0", method: "notifications/initialized" },
    ]);
    expect(result.response.status).toBe(200);
    const records = await waitRecords(f, 3);
    expect(records.map((record) => record.operation)).toEqual([
      "tools_call",
      "other",
      "notification",
    ]);
    expect(records.map((record) => record.rpc_outcome)).toEqual([
      "result",
      "result",
      "not_applicable",
    ]);
  });

  it("isolates logger failure and never writes metrics to stdout", async () => {
    const stdout = vi.spyOn(process.stdout, "write");
    const logger = vi.fn(() => {
      throw new Error("DO_NOT_LOG_LOGGER_ERROR");
    });
    const f = await fixture({ logger });
    const { messages } = await post(f.base, call());
    expect(messages[0].result.structuredContent.ok).toBe(true);
    await vi.waitFor(() => expect(logger).toHaveBeenCalledTimes(1));
    expect(stdout).not.toHaveBeenCalled();
  });

  it("uses the existing stderr logger by default and excludes health/GET probes", async () => {
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    const stdout = vi.spyOn(process.stdout, "write");
    const upstream = await listen((_req, res) => res.end('{"sources":[]}'));
    const base = await listen(
      createHttpApp(new CoinRithmClient({ baseUrl: upstream })),
    );
    for (const path of ["/", "/health", "/healthz", "/mcp", "/robots.txt"]) {
      await (await fetch(base + path)).text();
    }
    expect(stderr).not.toHaveBeenCalled();
    await post(base, call());
    await vi.waitFor(() => expect(stderr).toHaveBeenCalledTimes(1));
    expect(stderr.mock.calls[0][0]).toBe("[coinrithm-mcp]");
    const record = JSON.parse(stderr.mock.calls[0][1]);
    expect(record).toMatchObject({
      event: "mcp_completion",
      operation: "tools_call",
      delivery: "finished",
    });
    expect(stderr.mock.calls[0][1]).not.toContain("\n");
    expect(stdout).not.toHaveBeenCalled();
  });
});

describe("HTTP observer delivery edge cases", () => {
  function observer(send: Transport["send"] = async () => {}) {
    const res = Object.assign(new EventEmitter(), {
      headersSent: true,
      statusCode: 200,
      writableFinished: false,
    }) as unknown as ServerResponse;
    const lines: string[] = [];
    const observe = observeHttpCompletion(
      { headers: {} } as IncomingMessage,
      res,
      (line) => lines.push(line),
    );
    const originalIncoming = vi.fn();
    const transport: Transport = {
      send,
      start: async () => {},
      close: async () => {},
      onmessage: originalIncoming,
    };
    observe.attach(transport);
    transport.onmessage?.({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "pm_data_sources" },
    });
    const result = {
      jsonrpc: "2.0" as const,
      id: 1,
      result: { content: [], structuredContent: { ok: true, httpStatus: 200 } },
    };
    return { res, transport, lines, result, originalIncoming };
  }

  it("waits for an in-flight send, clears failed success, and emits finish/close only once", async () => {
    const gate = deferred();
    const error = new Error("DO_NOT_LOG_SEND_FAILURE");
    const f = observer(async () => {
      await gate.promise;
      throw error;
    });
    const pending = f.transport.send(f.result).catch((caught) => caught);
    f.res.emit("finish");
    expect(f.lines).toHaveLength(0);
    gate.resolve();
    expect(await pending).toBe(error);
    f.res.emit("close");
    expect(f.lines).toHaveLength(1);
    expect(JSON.parse(f.lines[0])).toMatchObject({
      rpc_outcome: "no_response",
      result_ok: null,
      result_http_status: null,
      delivery: "finished",
    });
    expect(f.lines[0]).not.toContain("DO_NOT_LOG");
    expect(f.originalIncoming).toHaveBeenCalledTimes(1);
  });

  it("does not invent an HTTP200 on pre-header abort or retain late completion IDs", async () => {
    const f = observer();
    Object.assign(f.res, { headersSent: false });
    f.res.emit("close");
    await f.transport.send(f.result);
    f.res.emit("finish");
    expect(f.lines).toHaveLength(1);
    expect(JSON.parse(f.lines[0])).toMatchObject({
      http_status: null,
      delivery: "aborted",
      rpc_outcome: "no_response",
    });
  });

  it("clears an in-flight success on abort even if send rejects later", async () => {
    const gate = deferred();
    const failure = new Error("DO_NOT_LOG");
    const f = observer(async () => {
      await gate.promise;
      throw failure;
    });
    const pending = f.transport.send(f.result).catch((error) => error);
    f.res.emit("close");
    expect(JSON.parse(f.lines[0])).toMatchObject({
      delivery: "aborted",
      rpc_outcome: "no_response",
      result_ok: null,
      result_http_status: null,
    });
    gate.resolve();
    expect(await pending).toBe(failure);
    expect(f.lines).toHaveLength(1);
  });

  it("does not infer a result from HTTP200 or ambiguous duplicate RPC IDs", async () => {
    const f = observer();
    f.transport.onmessage?.({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "pm_data_sources" },
    });
    await f.transport.send(f.result);
    f.res.emit("finish");
    expect(f.lines).toHaveLength(2);
    for (const line of f.lines)
      expect(JSON.parse(line)).toMatchObject({
        rpc_outcome: "no_response",
        http_status: 200,
        result_ok: null,
      });
  });

  it("ignores unrelated server notifications and clamps malformed result scalars", async () => {
    const f = observer();
    await f.transport.send({
      jsonrpc: "2.0",
      method: "notifications/message",
      params: { data: "DO_NOT_LOG" },
    });
    await f.transport.send({
      ...f.result,
      result: {
        content: [],
        structuredContent: { ok: "DO_NOT_LOG", httpStatus: 9999 },
      },
    });
    f.res.emit("finish");
    const record = JSON.parse(f.lines[0]);
    expect(record).toMatchObject({
      rpc_outcome: "result",
      result_ok: null,
      result_http_status: null,
    });
    expect(Number.isFinite(record.duration_ms)).toBe(true);
    expect(record.duration_ms).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(record.completed_at))).toBe(false);
    expect(f.lines[0]).not.toContain("DO_NOT_LOG");
  });
});

it("keeps the real SDK stdio channel protocol-only, without HTTP completion logs", async () => {
  const upstream = await listen((_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end('{"sources":[]}');
  });
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  let protocol = "";
  stdout.on("data", (chunk) => {
    protocol += chunk.toString();
  });
  const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
  const processStdout = vi.spyOn(process.stdout, "write");
  const server = new McpServer({ name: "stdio-fixture", version: "0" });
  registerTools(server, new CoinRithmClient({ baseUrl: upstream }));
  await server.connect(new StdioServerTransport(stdin, stdout));
  cleanups.push(() => server.close());
  stdin.write(JSON.stringify(call()) + "\n");
  await vi.waitFor(() => expect(protocol.trim()).not.toBe(""));
  const frames = protocol
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(frames).toHaveLength(1);
  expect(frames[0]).toMatchObject({
    jsonrpc: "2.0",
    id: "DO_NOT_LOG_RPC_ID",
    result: {
      isError: false,
      structuredContent: { httpStatus: 200, ok: true, body: { sources: [] } },
    },
  });
  expect(JSON.parse(frames[0].result.content[0].text)).toEqual(
    frames[0].result.structuredContent,
  );
  expect(protocol).not.toContain("mcp_completion");
  expect(stderr).not.toHaveBeenCalled();
  expect(processStdout).not.toHaveBeenCalled();
});
