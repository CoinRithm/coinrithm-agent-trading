import { afterEach, describe, expect, it, vi } from "vitest";
import { selectProvider, type DecideResult } from "./providers.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { parseDecision } from "./decision.js";

const SUPER = "nvidia/nemotron-3-super-120b-a12b";
const malformed = '{"decision":"act","actions":"[]","reason":"private"}';
const valid = '{"decision":"skip","actions":[]}';
const spec = parseSkill(renderFolderOfOne("fixture", "conservative")).spec;
const input = { system: "strategy", user: "observation", maxTokens: 2048 };
function response(text: string, source = "tool_call", finish = "stop") {
  return Response.json({
    choices: [
      {
        finish_reason: finish,
        message:
          source === "tool_call"
            ? {
                tool_calls: [
                  {
                    function: {
                      name: "submit_trading_decision",
                      arguments: text,
                    },
                  },
                ],
              }
            : { content: text },
      },
    ],
    usage: { prompt_tokens: 100, completion_tokens: 10 },
  });
}
function provider(fetchFn: typeof fetch, model = SUPER, baseUrl?: string) {
  return selectProvider(
    { ...spec, model: { provider: "nvidia", name: model, baseUrl } },
    { NVIDIA_API_KEY: "fixture-key" },
    fetchFn,
  );
}
const body = (f: ReturnType<typeof vi.fn<typeof fetch>>, i: number) =>
  JSON.parse(String(f.mock.calls[i]![1]!.body)) as Record<string, unknown>;

describe("direct Super malformed tool recovery", () => {
  afterEach(() => vi.useRealTimers());

  it("rejects the first text and obtains a newly parsed same-model decision with both attempts and usage", async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(malformed))
      .mockResolvedValueOnce(response(valid, "content"));
    const result = await provider(f).decide(input);
    expect(result).toMatchObject({
      ok: true,
      text: valid,
      responseSource: "content",
      usage: { promptTokens: 200, completionTokens: 20 },
      route: {
        effectiveModel: SUPER,
        attempts: [
          {
            model: SUPER,
            outcome: "failed",
            failureClass: "malformed",
            responseSource: "tool_call",
            actionsStringDiagnostic: "json_array_empty_valid_decision",
          },
          { model: SUPER, outcome: "success", responseSource: "content" },
        ],
      },
    });
    expect(f).toHaveBeenCalledTimes(2);
    expect(f.mock.calls[1]![0]).toBe(f.mock.calls[0]![0]);
    expect(f.mock.calls[1]![1]!.headers).toEqual(f.mock.calls[0]![1]!.headers);
    const first = body(f, 0),
      second = body(f, 1);
    expect(first.tool_choice).toBeDefined();
    expect(second.response_format).toEqual({ type: "json_object" });
    delete first.tools;
    delete first.tool_choice;
    delete second.response_format;
    expect(second).toEqual(first);
    expect(JSON.stringify(result.route)).not.toContain("private");
  });

  it.each([
    { text: valid, source: "tool_call" },
    { text: malformed, source: "content" },
    { text: '{"decision":"act","actions":[]}', source: "tool_call" },
    { text: "not JSON", source: "tool_call" },
    {
      text: malformed,
      source: "tool_call",
      model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    },
    {
      text: malformed,
      source: "tool_call",
      baseUrl: "https://custom.example/v1",
    },
    { text: malformed, source: "tool_call", finish: "length" },
  ])(
    "leaves unrelated or complete first responses unchanged: %j",
    async (test) => {
      const f = vi
        .fn<typeof fetch>()
        .mockResolvedValue(response(test.text, test.source, test.finish));
      await provider(f, test.model, test.baseUrl).decide(input);
      expect(f).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects malformed content without coercion or a third call and retains both charges", async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(malformed))
      .mockResolvedValueOnce(response(malformed, "content"));
    const result = await provider(f).decide(input);
    expect(result).toMatchObject({
      ok: false,
      failureClass: "malformed",
      usage: { promptTokens: 200, completionTokens: 20 },
    });
    expect(result).not.toHaveProperty("text");
    expect(
      result.route?.attempts.map((a) => [a.outcome, a.responseSource]),
    ).toEqual([
      ["failed", "tool_call"],
      ["failed", "content"],
    ]);
    expect(f).toHaveBeenCalledTimes(2);
    expect(parseDecision(malformed).ok).toBe(false);
  });

  it.each([429, 500, 503])(
    "does not nest another retry after content HTTP %i",
    async (status) => {
      const f = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(response(malformed))
        .mockResolvedValueOnce(new Response("busy", { status }));
      const result = await provider(f).decide(input);
      expect(result).toMatchObject({
        ok: false,
        status,
        usage: { promptTokens: 100, completionTokens: 10 },
      });
      expect(result.route?.attempts).toHaveLength(2);
      expect(f).toHaveBeenCalledTimes(2);
    },
  );

  it("does not nest content recovery after the existing server-error retry", async () => {
    vi.useFakeTimers();
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unavailable", { status: 500 }))
      .mockResolvedValueOnce(response(malformed));
    const pending = provider(f).decide(input);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await pending;
    expect(result).toMatchObject({ ok: false, failureClass: "malformed" });
    expect(result.route?.attempts).toHaveLength(2);
    expect(f).toHaveBeenCalledTimes(2);
    expect(body(f, 1).tool_choice).toBeDefined();
  });

  it("aborts the retry body under the original deadline and retains the first usage", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    const f = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return response(malformed);
      })
      .mockImplementationOnce(async (_url, init) => {
        signal = init?.signal;
        return new Promise<Response>(() => {});
      });
    const pending = provider(f).decide({ ...input, timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    const result: DecideResult = await pending;
    expect(result).toMatchObject({
      ok: false,
      usage: { promptTokens: 100, completionTokens: 10 },
    });
    expect(signal?.aborted).toBe(true);
    expect(f).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
});
