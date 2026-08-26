import { describe, it, expect, vi } from "vitest";
import { probeDecisionContract } from "./decisionProbe.js";

const okChat = (content: string) =>
  new Response(
    JSON.stringify({ choices: [{ message: { content } }] }),
    { status: 200 },
  );

describe("probeDecisionContract", () => {
  it("passes only when a REAL parsed decision comes back, using the family's request shape", async () => {
    let sent: Record<string, unknown> | undefined;
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      sent = JSON.parse(String(init?.body));
      return okChat('{"decision":"skip","reason":"contract probe"}');
    });
    const res = await probeDecisionContract(
      { provider: "openai", model: "gpt-5-nano", key: "sk-secret-1" },
      fetchFn as unknown as typeof fetch,
    );
    expect(res).toEqual({ ok: true });
    // Representative = the gpt-5 contract, not the generic compat shape.
    expect(sent?.max_completion_tokens).toBe(1024);
    expect(sent).not.toHaveProperty("max_tokens");
    expect(sent).not.toHaveProperty("temperature");
  });

  it("sends the nemotron reasoning toggles exactly as a real cycle would", async () => {
    let sent: Record<string, unknown> | undefined;
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      sent = JSON.parse(String(init?.body));
      return okChat('{"decision":"skip"}');
    });
    const res = await probeDecisionContract(
      {
        provider: "nvidia",
        model: "nvidia/nemotron-3-nano-30b-a3b",
        key: "nvapi-x",
      },
      fetchFn as unknown as typeof fetch,
    );
    expect(res.ok).toBe(true);
    expect(sent?.chat_template_kwargs).toEqual({ enable_thinking: false });
    expect(
      (sent?.messages as Array<{ content: string }>)[0].content.startsWith(
        "detailed thinking off",
      ),
    ).toBe(true);
  });

  it("classifies 2xx-with-empty-content as 'empty' (reasoning ate the budget)", async () => {
    const fetchFn = vi.fn(async () => okChat(""));
    const res = await probeDecisionContract(
      { provider: "openai", model: "gpt-5-nano", key: "sk-secret-1" },
      fetchFn as unknown as typeof fetch,
    );
    expect(res).toMatchObject({ ok: false, stage: "empty" });
  });

  it("classifies a think-chain in the JSON slot as 'parse' (the 62f3a12 failure)", async () => {
    const fetchFn = vi.fn(async () =>
      okChat("We need to figure out whether to trade here."),
    );
    const res = await probeDecisionContract(
      { provider: "nvidia", model: "some/other-model", key: "nvapi-x" },
      fetchFn as unknown as typeof fetch,
    );
    expect(res).toMatchObject({ ok: false, stage: "parse" });
  });

  it("classifies provider refusals as 'http' with the key sanitized out and structured status", async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response("gone; auth was Bearer sk-secret-410-echo for key sk-secret-410-echo", {
          status: 410,
        }),
    );
    const res = await probeDecisionContract(
      { provider: "nvidia", model: "meta/llama-3.1-8b-instruct", key: "sk-secret-410-echo" },
      fetchFn as unknown as typeof fetch,
    );
    expect(res).toMatchObject({ ok: false, stage: "http", status: 410 });
    if (!res.ok) {
      expect(res.error).toContain("410");
      expect(res.error).not.toContain("sk-secret-410-echo");
    }
  });

  it("carries Retry-After through as structured cooldown metadata (429)", async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response("rate limited", {
          status: 429,
          headers: { "retry-after": "7" },
        }),
    );
    const res = await probeDecisionContract(
      { provider: "nvidia", model: "nvidia/nemotron-3-nano-30b-a3b", key: "nvapi-x" },
      fetchFn as unknown as typeof fetch,
    );
    expect(res).toMatchObject({
      ok: false,
      stage: "http",
      status: 429,
      retryAfterMs: 7000,
    });
  });
});
