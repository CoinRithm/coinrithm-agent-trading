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
});
