import { afterEach, describe, expect, it, vi } from "vitest";
import {
  providerForRoute,
  selectProvider,
  type ProviderEnv,
} from "./providers.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { DECISION_TOOL_NAME } from "./providerCapabilities.js";
import type { ProviderName } from "./types.js";

const spec = parseSkill(renderFolderOfOne("fixture", "conservative")).spec;
const input = { system: "fixture-system", user: "fixture-user" };
const text = '{"decision":"skip","actions":[]}';
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("provider configuration and response contracts", () => {
  it("requires an explicit self-host model", () => {
    expect(() => selectProvider({ ...spec, model: undefined }, {})).toThrow(
      "no model configured",
    );
  });
  it.each([
    ["anthropic", "ANTHROPIC_API_KEY"],
    ["groq", "GROQ_API_KEY"],
    ["nvidia", "NVIDIA_API_KEY"],
    ["gemini", "GEMINI_API_KEY"],
    ["openai", "OPENAI_API_KEY"],
    ["openai-compatible", "MODEL_API_KEY"],
  ] as const)(
    "reports the missing %s credential before any request",
    (provider, variable) => {
      expect(() =>
        selectProvider({ ...spec, model: { provider, name: "fixture" } }, {}),
      ).toThrow(variable);
    },
  );
  it("requires a compatible base URL for both configured and explicit routes", () => {
    expect(() =>
      selectProvider(
        { ...spec, model: { provider: "openai-compatible", name: "fixture" } },
        { MODEL_API_KEY: "fixture" },
      ),
    ).toThrow("needs model.baseUrl");
    expect(() =>
      providerForRoute(
        { provider: "openai-compatible", model: "fixture" },
        "fixture",
      ),
    ).toThrow("needs a baseUrl");
  });
  it("mechanical routes fail closed if accidentally asked to call a model", async () => {
    const fetchFn = vi.fn<typeof fetch>();
    const provider = providerForRoute(
      { provider: "mechanical", model: "fixture" },
      "",
      fetchFn,
    );
    expect(await provider.decide(input)).toMatchObject({
      ok: false,
      error: expect.stringContaining("no model"),
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it.each([
    ["openai", "OPENAI_API_KEY", "https://api.openai.com/v1/chat/completions"],
    ["groq", "GROQ_API_KEY", "https://api.groq.com/openai/v1/chat/completions"],
    [
      "gemini",
      "GEMINI_API_KEY",
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    ],
    [
      "gemini",
      "MODEL_API_KEY",
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    ],
    [
      "openai-compatible",
      "MODEL_API_KEY",
      "https://fixture.invalid/v1/chat/completions",
    ],
    [
      "openai-compatible",
      "OPENAI_API_KEY",
      "https://fixture.invalid/v1/chat/completions",
    ],
  ] as const)(
    "uses %s credentials from %s and the correct endpoint",
    async (provider, variable, url) => {
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({
            choices: [{ message: { content: text } }],
            usage: {},
          }),
        );
      const configured = selectProvider(
        {
          ...spec,
          model: {
            provider,
            name: "fixture",
            baseUrl: "https://fixture.invalid/v1///",
          },
        },
        { [variable]: "fixture-key" } as ProviderEnv,
        fetchFn,
      );
      expect(await configured.decide(input)).toEqual({
        ok: true,
        text,
        usage: { promptTokens: 0, completionTokens: 0 },
      });
      expect(fetchFn).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer fixture-key",
          }),
        }),
      );
    },
  );
  it.each([{}, { content: [] }, { content: [{}] }])(
    "rejects empty Anthropic content %j",
    async (body) => {
      const provider = providerForRoute(
        { provider: "anthropic", model: "fixture" },
        "fixture",
        vi.fn<typeof fetch>().mockResolvedValue(Response.json(body)),
      );
      expect(await provider.decide(input)).toEqual({
        ok: false,
        error: "anthropic returned empty content",
      });
    },
  );
  it("joins Anthropic text blocks and treats omitted usage counters as zero", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ content: [{}, { text }], usage: {} }));
    const provider = providerForRoute(
      { provider: "anthropic", model: "fixture" },
      "fixture",
      fetchFn,
    );
    expect(await provider.decide({ ...input, maxTokens: 77 })).toEqual({
      ok: true,
      text,
      usage: { promptTokens: 0, completionTokens: 0 },
    });
    expect(JSON.parse(String(fetchFn.mock.calls[0]![1]!.body))).toMatchObject({
      max_tokens: 77,
    });
  });
  it.each([
    {},
    { choices: [] },
    { choices: [{}] },
    { choices: [{ message: {} }] },
  ])("rejects missing compatible content %j", async (body) => {
    const provider = providerForRoute(
      { provider: "openai", model: "fixture" },
      "fixture",
      vi.fn<typeof fetch>().mockResolvedValue(Response.json(body)),
    );
    expect(await provider.decide(input)).toEqual({
      ok: false,
      error: "provider returned empty content",
    });
  });
  it("selects the decision tool over prose while ignoring unrelated tool calls", async () => {
    const body = {
      choices: [
        {
          message: {
            content: "prose",
            tool_calls: [
              {},
              { function: { name: "other" } },
              { function: { name: DECISION_TOOL_NAME, arguments: text } },
            ],
          },
        },
      ],
    };
    const provider = providerForRoute(
      { provider: "openai", model: "fixture" },
      "fixture",
      vi.fn<typeof fetch>().mockResolvedValue(Response.json(body)),
    );
    expect(await provider.decide(input)).toEqual({
      ok: true,
      text,
      usage: undefined,
    });
  });
  it.each(["anthropic", "openai"] as ProviderName[])(
    "contains non-Error %s transport failures",
    async (provider) => {
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockRejectedValue("transport unavailable");
      expect(
        await providerForRoute(
          { provider, model: "fixture" },
          "",
          fetchFn,
        ).decide(input),
      ).toEqual({ ok: false, error: "transport unavailable" });
      expect(fetchFn).toHaveBeenCalledOnce();
    },
  );
  it.each([
    [undefined, undefined],
    ["", undefined],
    ["invalid", undefined],
    ["-1", undefined],
    ["0", 0],
    ["1.5", 1500],
    ["99999", 3600000],
    ["Tue, 15 Sep 2026 00:00:02 GMT", 2000],
    ["Mon, 14 Sep 2026 00:00:00 GMT", 0],
  ])(
    "parses provider Retry-After %s without losing the one-hour cap",
    async (raw, expected) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-15T00:00:00Z"));
      const response = new Response("limited", {
        status: 429,
        headers: raw === undefined ? {} : { "retry-after": raw },
      });
      const provider = providerForRoute(
        { provider: "openai", model: "fixture" },
        "fixture",
        vi.fn<typeof fetch>().mockResolvedValue(response),
      );
      expect(await provider.decide(input)).toMatchObject({
        ok: false,
        status: 429,
        retryAfterMs: expected,
      });
    },
  );
  it.each([429, 401])(
    "retains classification if a same-model retry returns %i",
    async (status) => {
      vi.useFakeTimers();
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response("failed", { status: 503 }))
        .mockResolvedValueOnce(new Response("refused", { status }));
      const provider = selectProvider(
        { ...spec, model: { provider: "nvidia", name: "fixture" } },
        { MODEL_API_KEY: "fixture" },
        fetchFn,
      );
      const pending = provider.decide(input);
      await vi.advanceTimersByTimeAsync(1000);
      expect(await pending).toMatchObject({
        ok: false,
        route: {
          attempts: [
            { failureClass: "transient" },
            { failureClass: status === 429 ? "capacity" : "permanent" },
          ],
        },
      });
      expect(fetchFn).toHaveBeenCalledTimes(2);
    },
  );
  it("does not retry when the process wakes after the original deadline", async () => {
    vi.useFakeTimers();
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("failed", { status: 503 }));
    const provider = selectProvider(
      { ...spec, model: { provider: "nvidia", name: "fixture" } },
      { NVIDIA_API_KEY: "fixture" },
      fetchFn,
    );
    const pending = provider.decide({ ...input, timeoutMs: 2000 });
    await vi.advanceTimersByTimeAsync(0);
    vi.setSystemTime(Date.now() + 3000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toMatchObject({ ok: false, status: 503 });
    expect(fetchFn).toHaveBeenCalledOnce();
  });
});
