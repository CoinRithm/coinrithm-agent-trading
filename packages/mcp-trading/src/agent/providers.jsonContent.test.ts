import { describe, expect, it, vi } from "vitest";
import { providerForRoute } from "./providers.js";
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
