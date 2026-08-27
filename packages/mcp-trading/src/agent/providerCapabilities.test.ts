import { describe, it, expect } from "vitest";
import {
  chatShapeFor,
  buildChatBody,
  NVIDIA_BASE_URL,
} from "./providerCapabilities.js";

describe("chatShapeFor", () => {
  it("openai provider uses max_completion_tokens and forbids temperature (gpt-5 contract)", () => {
    const s = chatShapeFor("openai", "gpt-5-nano");
    expect(s.family).toBe("openai-reasoning");
    expect(s.tokenParam).toBe("max_completion_tokens");
    expect(s.allowsTemperature).toBe(false);
  });

  it("a gpt-5/o* model gets the openai shape even on an openai-compatible gateway", () => {
    for (const model of ["gpt-5-nano", "o3-mini", "o1"]) {
      const s = chatShapeFor(
        "openai-compatible",
        model,
        "https://gw.example/v1",
      );
      expect(s.family).toBe("openai-reasoning");
      expect(s.tokenParam).toBe("max_completion_tokens");
      expect(s.allowsTemperature).toBe(false);
    }
  });

  it("nemotron on the NVIDIA endpoint carries the kwargs switch AND the system hint", () => {
    const s = chatShapeFor(
      "nvidia",
      "nvidia/nemotron-3-nano-30b-a3b",
      NVIDIA_BASE_URL,
    );
    expect(s.family).toBe("nvidia-nemotron");
    expect(s.extraBody).toEqual({
      chat_template_kwargs: { enable_thinking: false },
    });
    expect(s.systemHint).toBe("detailed thinking off");
  });

  it("nemotron served elsewhere keeps the hint but never the NVIDIA-only kwargs", () => {
    const s = chatShapeFor(
      "openai-compatible",
      "some/nemotron-fork",
      "https://selfhost.example/v1",
    );
    expect(s.extraBody).toBeUndefined();
    expect(s.systemHint).toBe("detailed thinking off");
  });

  it("groq/gemini/compatible default to the classic OpenAI-compat shape", () => {
    for (const [provider, model] of [
      ["groq", "llama-3.1-8b-instant"],
      ["gemini", "gemini-2.0-flash"],
      ["openai-compatible", "mistral-7b"],
    ] as const) {
      const s = chatShapeFor(provider, model, "https://x.example/v1");
      expect(s.tokenParam).toBe("max_tokens");
      expect(s.allowsTemperature).toBe(true);
      expect(s.jsonResponseFormat).toBe(true);
    }
  });

  it("every routable model of the living fleet resolves with a >=1024 probe floor", () => {
    const routes: Array<[Parameters<typeof chatShapeFor>[0], string]> = [
      ["nvidia", "nvidia/nemotron-3-nano-30b-a3b"],
      ["nvidia", "nvidia/nemotron-3-super-120b-a12b"],
      ["nvidia", "openai/gpt-oss-20b"],
      ["nvidia", "openai/gpt-oss-120b"],
      ["openai", "gpt-5-nano"],
      ["anthropic", "claude-sonnet-5"],
    ];
    for (const [provider, model] of routes) {
      expect(
        chatShapeFor(provider, model, NVIDIA_BASE_URL).minProbeCompletionTokens,
      ).toBeGreaterThanOrEqual(1024);
    }
  });
});

describe("buildChatBody", () => {
  it("places the budget under the family's token param and prefixes the hint", () => {
    const nemotron = buildChatBody(
      chatShapeFor("nvidia", "nvidia/nemotron-3-nano-30b-a3b", NVIDIA_BASE_URL),
      {
        model: "nvidia/nemotron-3-nano-30b-a3b",
        system: "S",
        user: "U",
        maxTokens: 512,
      },
    );
    expect(nemotron.max_tokens).toBe(512);
    expect(nemotron.temperature).toBe(0.2);
    expect(nemotron.chat_template_kwargs).toEqual({ enable_thinking: false });
    expect((nemotron.messages as Array<{ content: string }>)[0].content).toBe(
      "detailed thinking off\n\nS",
    );

    const openai = buildChatBody(chatShapeFor("openai", "gpt-5-nano"), {
      model: "gpt-5-nano",
      system: "S",
      user: "U",
      maxTokens: 1024,
    });
    expect(openai.max_completion_tokens).toBe(1024);
    expect(openai).not.toHaveProperty("max_tokens");
    expect(openai).not.toHaveProperty("temperature");
    expect(openai.response_format).toEqual({ type: "json_object" });
  });
});
