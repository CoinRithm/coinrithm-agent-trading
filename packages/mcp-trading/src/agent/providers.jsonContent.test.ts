import { describe, expect, it, vi } from "vitest";
import { providerForRoute, selectProvider } from "./providers.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { parseDecision } from "./decision.js";
import {
  chatShapeFor,
  withJsonContentTransport,
  NVIDIA_BASE_URL,
} from "./providerCapabilities.js";

const SUPER = "nvidia/nemotron-3-super-120b-a12b";
const input = { system: "fixture-system", user: "fixture-user" };
const skip = '{"decision":"skip","actions":[]}';

function fetchReturning(message: Record<string, unknown>, finish = "stop") {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json({ choices: [{ finish_reason: finish, message }] }),
    );
}

function sentBody(fetchFn: ReturnType<typeof fetchReturning>) {
  return JSON.parse(String(fetchFn.mock.calls[0]![1]!.body)) as Record<
    string,
    unknown
  >;
}

describe("Nemotron JSON-content transport option", () => {
  it("changes only transport fields, preserving the exact messages and generation settings", async () => {
    const controlFetch = fetchReturning({ content: skip });
    const contentFetch = fetchReturning({ content: skip });
    const route = { provider: "nvidia" as const, model: SUPER };
    const request = {
      ...input,
      maxTokens: 2048,
      excludeActionTypes: ["futures_open"] as const,
    };
    await providerForRoute(route, "fixture", controlFetch).decide(request);
    await providerForRoute(route, "fixture", contentFetch, {
      nemotronJsonContent: true,
    }).decide(request);
    const control = sentBody(controlFetch);
    const content = sentBody(contentFetch);
    expect(content.messages).toEqual(control.messages);
    expect(content.max_tokens).toBe(2048);
    expect(content.response_format).toEqual({ type: "json_object" });
    expect(control.tools).toBeDefined();
    expect(control.tool_choice).toBeDefined();
    delete control.tools;
    delete control.tool_choice;
    delete content.response_format;
    expect(content).toEqual(control);
    expect(contentFetch.mock.calls[0]![0]).toBe(controlFetch.mock.calls[0]![0]);
    expect(contentFetch.mock.calls[0]![1]!.headers).toEqual(
      controlFetch.mock.calls[0]![1]!.headers,
    );
  });

  it("sends JSON content instead of the forced decision tool, keeping thinking off", async () => {
    const fetchFn = fetchReturning({ content: skip });
    const provider = providerForRoute(
      { provider: "nvidia", model: SUPER },
      "fixture",
      fetchFn,
      { nemotronJsonContent: true },
    );
    expect(await provider.decide(input)).toEqual({
      ok: true,
      text: skip,
      usage: undefined,
      responseSource: "content",
    });
    const body = sentBody(fetchFn);
    expect(body.tools).toBeUndefined();
    expect(body.tool_choice).toBeUndefined();
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });
    expect((body.messages as Array<{ content: string }>)[0]!.content).toMatch(
      /^detailed thinking off\n\n/,
    );
  });

  it("leaves the default forced tool call unchanged without the option", async () => {
    const fetchFn = fetchReturning({ content: skip });
    await providerForRoute(
      { provider: "nvidia", model: SUPER },
      "fixture",
      fetchFn,
    ).decide(input);
    const body = sentBody(fetchFn);
    expect(body.tool_choice).toBeDefined();
    expect(Array.isArray(body.tools)).toBe(true);
    expect(body.response_format).toBeUndefined();
  });

  it("is a no-op for every non-Nemotron shape", () => {
    for (const [provider, model] of [
      ["openai", "gpt-5-nano"],
      ["groq", "llama-3.1-8b-instant"],
      ["anthropic", "claude-fixture"],
    ] as const) {
      const shape = chatShapeFor(provider, model);
      expect(withJsonContentTransport(shape)).toBe(shape);
    }
  });

  it("keeps the strict parser: an actions string in content still fails closed", async () => {
    const actionsString =
      '{"decision":"act","actions":"[{\\"type\\":\\"futures_close\\",\\"positionId\\":1}]x"}';
    const provider = providerForRoute(
      { provider: "nvidia", model: SUPER, baseUrl: NVIDIA_BASE_URL },
      "fixture",
      fetchReturning({ content: actionsString }),
      { nemotronJsonContent: true },
    );
    const result = await provider.decide(input);
    expect(result).toMatchObject({ ok: true, responseSource: "content" });
    const parsed = parseDecision((result as { text: string }).text);
    expect(parsed.ok).toBe(false);
  });

  it("still treats a length-truncated content decision as malformed", async () => {
    const provider = providerForRoute(
      { provider: "nvidia", model: SUPER },
      "fixture",
      fetchReturning({ content: '{"decision":"act","actions":[' }, "length"),
      { nemotronJsonContent: true },
    );
    expect(await provider.decide(input)).toMatchObject({
      ok: false,
      failureClass: "malformed",
    });
  });
});

describe("BYO selectProvider transport option", () => {
  const byoSpec = (provider: "nvidia" | "groq", name: string) => ({
    ...parseSkill(renderFolderOfOne("fixture", "conservative")).spec,
    model: { provider, name },
  });
  const freshFetch = () =>
    vi.fn<typeof fetch>().mockImplementation(async () =>
      Response.json({
        choices: [{ finish_reason: "stop", message: { content: skip } }],
      }),
    );
  const bodyOf = (f: ReturnType<typeof freshFetch>, i: number) =>
    JSON.parse(String(f.mock.calls[i]![1]!.body)) as Record<string, unknown>;

  it("keeps the forced tool call for an ordinary BYO Super agent", async () => {
    const f = freshFetch();
    await selectProvider(
      byoSpec("nvidia", SUPER),
      { NVIDIA_API_KEY: "k" },
      f,
    ).decide(input);
    expect(bodyOf(f, 0).tool_choice).toBeDefined();
    expect(bodyOf(f, 0).response_format).toBeUndefined();
  });

  it("sends JSON content for an opted-in BYO Super agent on its own key", async () => {
    const f = freshFetch();
    await selectProvider(byoSpec("nvidia", SUPER), { NVIDIA_API_KEY: "k" }, f, {
      nemotronJsonContent: true,
    }).decide(input);
    expect(bodyOf(f, 0).tools).toBeUndefined();
    expect(bodyOf(f, 0).response_format).toEqual({ type: "json_object" });
    expect(f.mock.calls[0]![1]!.headers).toMatchObject({
      Authorization: "Bearer k",
    });
  });

  it("re-evaluates a selector on every request and fails closed when it throws", async () => {
    const f = freshFetch();
    let on = true;
    const p = selectProvider(
      byoSpec("nvidia", SUPER),
      { NVIDIA_API_KEY: "k" },
      f,
      {
        nemotronJsonContent: () => on,
      },
    );
    await p.decide(input);
    on = false;
    await p.decide(input);
    expect(bodyOf(f, 0).response_format).toEqual({ type: "json_object" });
    expect(bodyOf(f, 1).tool_choice).toBeDefined();
    const g = freshFetch();
    await selectProvider(byoSpec("nvidia", SUPER), { NVIDIA_API_KEY: "k" }, g, {
      nemotronJsonContent: () => {
        throw new Error("boom");
      },
    }).decide(input);
    expect(bodyOf(g, 0).tool_choice).toBeDefined();
  });

  it("does not change a non-Nemotron BYO request", async () => {
    const a = freshFetch();
    const b = freshFetch();
    await selectProvider(
      byoSpec("groq", "llama-3.1-8b-instant"),
      { GROQ_API_KEY: "k" },
      a,
    ).decide(input);
    await selectProvider(
      byoSpec("groq", "llama-3.1-8b-instant"),
      { GROQ_API_KEY: "k" },
      b,
      {
        nemotronJsonContent: true,
      },
    ).decide(input);
    expect(bodyOf(b, 0)).toEqual(bodyOf(a, 0));
  });
});
