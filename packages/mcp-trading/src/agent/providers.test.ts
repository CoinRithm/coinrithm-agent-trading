import { describe, it, expect, vi } from "vitest";
import { selectProvider } from "./providers.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";

// conservative template -> model anthropic/claude-sonnet-4-6.
const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;

describe("selectProvider", () => {
  it("throws when the env key is missing (key never from the agent file)", () => {
    expect(() => selectProvider(spec, {}, fetch)).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("uses the env key only and sends it as a header", async () => {
    let sentKey: string | undefined;
    const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
      sentKey = (init.headers as Record<string, string>)["x-api-key"];
      return new Response(JSON.stringify({ content: [{ text: '{"decision":"skip"}' }] }), { status: 200 });
    });
    const p = selectProvider(spec, { ANTHROPIC_API_KEY: "sk-ant-test" }, fetchFn as unknown as typeof fetch);
    const r = await p.decide({ system: "s", user: "u" });
    expect(r.ok).toBe(true);
    expect(sentKey).toBe("sk-ant-test");
  });

  it("nvidia preset hits the NIM endpoint with NVIDIA_API_KEY (no baseUrl needed)", async () => {
    const nvSpec = { ...spec, model: { provider: "nvidia" as const, name: "meta/llama-3.3-70b-instruct" } };
    let url = "";
    let auth: string | undefined;
    const fetchFn = vi.fn(async (u: string, init: RequestInit) => {
      url = u;
      auth = (init.headers as Record<string, string>)["Authorization"];
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"decision":"skip","actions":[]}' } }] }), { status: 200 });
    });
    const p = selectProvider(nvSpec, { NVIDIA_API_KEY: "nvapi-test" }, fetchFn as unknown as typeof fetch);
    const r = await p.decide({ system: "s", user: "u" });
    expect(r.ok).toBe(true);
    expect(url).toBe("https://integrate.api.nvidia.com/v1/chat/completions");
    expect(auth).toBe("Bearer nvapi-test");
  });

  it("nvidia preset errors with a clear NVIDIA_API_KEY message when the key is absent", () => {
    const nvSpec = { ...spec, model: { provider: "nvidia" as const, name: "meta/llama-3.3-70b-instruct" } };
    expect(() => selectProvider(nvSpec, {}, fetch)).toThrow(/NVIDIA_API_KEY/);
  });

  it("forces 'detailed thinking off' for nemotron models (else they emit a slow think-chain)", async () => {
    const nemoSpec = {
      ...spec,
      model: { provider: "nvidia" as const, name: "nvidia/llama-3.3-nemotron-super-49b-v1" },
    };
    let systemSent = "";
    const fetchFn = vi.fn(async (_u: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as {
        messages: Array<{ role: string; content: string }>;
      };
      systemSent = body.messages.find((m) => m.role === "system")?.content ?? "";
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"decision":"skip"}' } }] }), { status: 200 });
    });
    const p = selectProvider(nemoSpec, { NVIDIA_API_KEY: "nvapi-test" }, fetchFn as unknown as typeof fetch);
    await p.decide({ system: "STRATEGY", user: "u" });
    expect(systemSent.startsWith("detailed thinking off")).toBe(true);
    expect(systemSent).toContain("STRATEGY");
  });

  it("does NOT add the reasoning toggle for non-nemotron models", async () => {
    const nvSpec = { ...spec, model: { provider: "nvidia" as const, name: "meta/llama-3.1-8b-instruct" } };
    let systemSent = "";
    const fetchFn = vi.fn(async (_u: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { messages: Array<{ role: string; content: string }> };
      systemSent = body.messages.find((m) => m.role === "system")?.content ?? "";
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"decision":"skip"}' } }] }), { status: 200 });
    });
    const p = selectProvider(nvSpec, { NVIDIA_API_KEY: "nvapi-test" }, fetchFn as unknown as typeof fetch);
    await p.decide({ system: "STRATEGY", user: "u" });
    expect(systemSent).toBe("STRATEGY");
  });

  it("aborts a hung model call and reports a timeout (never bleeds past the cadence)", async () => {
    const nvSpec = { ...spec, model: { provider: "nvidia" as const, name: "meta/llama-3.1-8b-instruct" } };
    // fetchFn that only settles when the abort signal fires.
    const fetchFn = vi.fn((_u: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
        );
      }),
    );
    const p = selectProvider(nvSpec, { NVIDIA_API_KEY: "nvapi-test" }, fetchFn as unknown as typeof fetch);
    const r = await p.decide({ system: "s", user: "u", timeoutMs: 20 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/timed out/);
  });
});
